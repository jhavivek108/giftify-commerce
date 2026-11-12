import { env } from '../config/env.js';
import { Cart } from '../models/Cart.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { FINAL_ORDER_STATUSES } from '../utils/constants.js';
import { round2 } from '../utils/money.js';
import { generateOrderNumber } from '../utils/orderNumber.js';
import { sessionOptions, withTransaction } from '../utils/withTransaction.js';
import { initiatePayment } from './payments/index.js';
import { LINE_PROBLEMS, purchaseInfo } from './productService.js';

/** deliveryCharge = DELIVERY_CHARGE unless FREE_DELIVERY_ABOVE > 0 and subtotal reaches it. */
export function deliveryChargeFor(subtotal) {
  if (env.freeDeliveryAbove > 0 && subtotal >= env.freeDeliveryAbove) return 0;
  return env.deliveryCharge;
}

const stockKey = (productId, variantId) => `${productId}:${variantId ?? ''}`;

/** Atomically takes `quantity` out of stock. Returns false when there is not enough. */
async function takeStock({ productId, variantId, quantity }, session) {
  const options = sessionOptions(session);
  const result = variantId
    ? await Product.updateOne(
        { _id: productId, isAvailable: true, variants: { $elemMatch: { _id: variantId, isAvailable: true, stock: { $gte: quantity } } } },
        { $inc: { 'variants.$.stock': -quantity } },
        options,
      )
    : await Product.updateOne(
        { _id: productId, isAvailable: true, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        options,
      );
  return result.modifiedCount === 1;
}

/** Puts stock back (order cancelled, or manual rollback without a transaction). */
async function returnStock({ productId, variantId, quantity }, session) {
  const options = sessionOptions(session);
  if (variantId) {
    await Product.updateOne({ _id: productId, 'variants._id': variantId }, { $inc: { 'variants.$.stock': quantity } }, options);
  } else {
    await Product.updateOne({ _id: productId }, { $inc: { stock: quantity } }, options);
  }
}

async function placeOrder(input, user, session) {
  const options = sessionOptions(session);
  const taken = []; // stock decrements already applied, for manual rollback

  try {
    // 1. Load the real products. Client-sent prices are never used.
    const ids = [...new Set(input.items.map((item) => item.productId))];
    const products = await Product.find({ _id: { $in: ids } }, null, options).populate('category', 'name isActive');
    const byId = new Map(products.map((product) => [String(product._id), product]));

    // 2. Validate every line and build the price/name snapshots.
    const errors = [];
    const wanted = new Map(); // total quantity requested per product+variant
    const lines = input.items.map((item, index) => {
      const product = byId.get(item.productId);
      const info = purchaseInfo(product, item.variantId);
      if (info.problem) {
        const field = info.problem.startsWith('variant')
          ? 'variantId'
          : info.problem === 'out_of_stock'
            ? 'quantity'
            : 'productId';
        const label = product ? `${product.name}: ` : '';
        errors.push({ path: `items.${index}.${field}`, message: `${label}${LINE_PROBLEMS[info.problem]}` });
        return null;
      }
      const key = stockKey(product._id, info.variant?._id);
      const total = (wanted.get(key) ?? 0) + item.quantity;
      wanted.set(key, total);
      if (total > info.stock) {
        const size = info.variant ? ` (${info.variant.size})` : '';
        errors.push({ path: `items.${index}.quantity`, message: `${product.name}${size}: only ${info.stock} left in stock` });
        return null;
      }
      return {
        stock: { productId: product._id, variantId: info.variant?._id ?? null, quantity: item.quantity },
        snapshot: {
          product: product._id,
          variantId: info.variant?._id ?? null,
          name: product.name,
          slug: product.slug,
          image: product.images[0]?.url ?? '',
          categoryName: product.category?.name ?? '',
          size: info.variant?.size ?? null,
          colour: item.colour ?? '',
          quantity: item.quantity,
          unitPrice: info.unitPrice,
          lineTotal: round2(info.unitPrice * item.quantity),
          priceUnit: product.priceUnit,
          customisation: {
            instructions: item.customisation?.instructions ?? '',
            message: item.customisation?.message ?? '',
          },
        },
      };
    });
    if (errors.length > 0) {
      throw ApiError.unprocessable('Some items in your order are not available. Please review your cart.', errors);
    }

    // 3. Take the stock. The conditional update makes overselling impossible
    //    even when two customers check out at the same moment.
    for (const [index, line] of lines.entries()) {
      if (!(await takeStock(line.stock, session))) {
        throw ApiError.unprocessable('Some items in your order just went out of stock. Please review your cart.', [
          { path: `items.${index}.quantity`, message: `${line.snapshot.name}: not enough stock left` },
        ]);
      }
      taken.push(line.stock);
    }

    // 4. Totals, computed on the server only.
    const subtotal = round2(lines.reduce((sum, line) => sum + line.snapshot.lineTotal, 0));
    const deliveryCharge = deliveryChargeFor(subtotal);
    const total = round2(subtotal + deliveryCharge);

    // 5. Payment always starts as pending (see services/payments).
    const orderNumber = generateOrderNumber();
    const payment = await initiatePayment(input.paymentMethod, { orderNumber, total });

    const [order] = await Order.create(
      [
        {
          orderNumber,
          user: user?._id ?? null,
          customer: input.customer,
          shippingAddress: input.shippingAddress,
          deliveryInstructions: input.deliveryInstructions ?? '',
          orderNotes: input.orderNotes ?? '',
          items: lines.map((line) => line.snapshot),
          subtotal,
          deliveryCharge,
          total,
          paymentMethod: input.paymentMethod,
          paymentStatus: payment.paymentStatus,
          paymentReference: payment.paymentReference ?? '',
          status: 'placed',
          statusHistory: [{ status: 'placed', note: 'Order placed', at: new Date(), by: user?._id ?? null }],
        },
      ],
      options,
    );

    // 6. A logged-in customer's server cart is now spent.
    if (user) await Cart.updateOne({ user: user._id }, { $set: { items: [] } }, options);

    return order;
  } catch (error) {
    // Inside a transaction MongoDB rolls everything back for us. Without one
    // (standalone server) the stock taken so far has to be returned by hand.
    if (!session) {
      for (const stock of taken) await returnStock(stock, null).catch(() => {});
    }
    throw error;
  }
}

const isOrderNumberClash = (error) => error?.code === 11000 && 'orderNumber' in (error.keyPattern ?? {});

/**
 * Creates an order: validates items against the database, recomputes all
 * prices, decrements stock and stores the order in one transaction.
 */
export async function createOrder(input, user) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await withTransaction((session) => placeOrder(input, user, session));
    } catch (error) {
      // An order number collision is astronomically unlikely; just draw another.
      if (!isOrderNumberClash(error) || attempt >= 5) throw error;
    }
  }
}

/**
 * Moves an order to a new status and records it in statusHistory.
 * Cancelling returns every line's stock, in the same transaction.
 * `allowedFrom` optionally restricts which current statuses may be changed
 * (customers may only cancel while the order is still "placed").
 */
export async function changeOrderStatus({ orderId, status, note = '', actor, ownerId, allowedFrom }) {
  return withTransaction(async (session) => {
    const options = sessionOptions(session);
    const filter = ownerId ? { _id: orderId, user: ownerId } : { _id: orderId };
    const order = await Order.findOne(filter, null, options);
    if (!order) throw ApiError.notFound('Order not found');

    if (FINAL_ORDER_STATUSES.includes(order.status)) {
      throw ApiError.unprocessable(`This order is already ${order.status} and can no longer be changed`);
    }
    if (order.status === status) throw ApiError.unprocessable(`This order is already ${status}`);
    if (allowedFrom && !allowedFrom.includes(order.status)) {
      throw ApiError.unprocessable(
        `This order is already ${order.status} and can no longer be cancelled online. Please contact us on WhatsApp.`,
      );
    }

    // The status condition guards against two people changing the order at
    // once, so stock can never be returned twice.
    const updated = await Order.findOneAndUpdate(
      { _id: order._id, status: order.status },
      { $set: { status }, $push: { statusHistory: { status, note, at: new Date(), by: actor?._id ?? null } } },
      { new: true, ...options },
    );
    if (!updated) throw ApiError.conflict('This order was just updated by someone else. Please refresh and try again.');

    if (status === 'cancelled') {
      for (const item of updated.items) {
        if (item.product) {
          await returnStock({ productId: item.product, variantId: item.variantId, quantity: item.quantity }, session);
        }
      }
    }
    return updated;
  });
}

/** Admin-only: records a manual payment update. This is the ONLY way an order becomes paid. */
export async function updatePayment({ orderId, paymentStatus, reference, note = '', actor }) {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');

  const now = new Date();
  order.paymentStatus = paymentStatus;
  if (reference !== undefined) order.paymentReference = reference;
  if (paymentStatus === 'paid') order.paidAt = now;
  else if (paymentStatus !== 'refunded') order.paidAt = null; // pending / failed: there is no payment date
  order.paymentHistory.push({ status: paymentStatus, reference: reference ?? '', note, at: now, by: actor._id });

  await order.save();
  return order;
}
