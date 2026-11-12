import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { MAX_CART_LINES } from '../utils/constants.js';
import { round2 } from '../utils/money.js';
import { LINE_PROBLEMS, purchaseInfo } from './productService.js';

const PRODUCT_POPULATE = {
  path: 'items.product',
  populate: { path: 'category', select: 'name slug isActive' },
};

export async function getOrCreateCart(userId) {
  return Cart.findOneAndUpdate({ user: userId }, { $setOnInsert: { user: userId } }, { upsert: true, new: true });
}

const normaliseCustomisation = (customisation) => ({
  instructions: customisation?.instructions?.trim() ?? '',
  message: customisation?.message?.trim() ?? '',
});

/** Two lines are "the same" when product, variant, colour and customisation all match. */
function sameLine(item, line) {
  return (
    String(item.product) === String(line.productId) &&
    String(item.variantId ?? '') === String(line.variantId ?? '') &&
    (item.colour ?? '') === line.colour &&
    (item.customisation?.instructions ?? '') === line.customisation.instructions &&
    (item.customisation?.message ?? '') === line.customisation.message
  );
}

/**
 * Adds one line to a cart document (does not save).
 * strict = true  -> throws ApiError when the line cannot be added (POST /cart)
 * strict = false -> returns false instead, and clamps the quantity to what is in stock (merge)
 */
export async function addLine(cart, input, { strict = true } = {}) {
  const fail = (status, message) => {
    if (strict) throw new ApiError(status, message);
    return false;
  };

  const product = await Product.findById(input.productId).populate('category', 'name slug isActive');
  if (!product) return fail(404, 'Product not found');

  const info = purchaseInfo(product, input.variantId);
  if (info.problem) return fail(422, LINE_PROBLEMS[info.problem]);

  const line = {
    productId: product._id,
    variantId: info.variant?._id ?? null,
    colour: input.colour?.trim() ?? '',
    customisation: normaliseCustomisation(input.customisation),
  };
  const existing = cart.items.find((item) => sameLine(item, line));
  let quantity = (existing?.quantity ?? 0) + input.quantity;

  if (quantity > info.maxQuantity) {
    if (strict) {
      const already = existing ? ` (you already have ${existing.quantity} in your cart)` : '';
      throw ApiError.unprocessable(`Only ${info.maxQuantity} available${already}`);
    }
    quantity = info.maxQuantity;
  }

  if (existing) {
    existing.quantity = quantity;
  } else {
    if (cart.items.length >= MAX_CART_LINES) return fail(422, `Your cart can hold at most ${MAX_CART_LINES} different items`);
    cart.items.push({
      product: line.productId,
      variantId: line.variantId,
      colour: line.colour,
      quantity,
      customisation: line.customisation,
    });
  }
  return true;
}

/** Checks a new quantity for an existing line against live stock. */
export async function assertQuantityAvailable(item, quantity) {
  const product = await Product.findById(item.product).populate('category', 'name slug isActive');
  const info = purchaseInfo(product, item.variantId);
  if (info.problem) throw ApiError.unprocessable(LINE_PROBLEMS[info.problem]);
  if (quantity > info.maxQuantity) throw ApiError.unprocessable(`Only ${info.maxQuantity} available`);
}

/**
 * Builds the cart payload sent to the client. Prices always come from the
 * database at read time. Lines whose product was deleted are removed.
 */
export async function buildCartResponse(cart) {
  await cart.populate(PRODUCT_POPULATE);

  const orphaned = cart.items.filter((item) => !item.product);
  if (orphaned.length > 0) {
    for (const item of orphaned) cart.items.pull(item._id);
    await cart.save();
    await cart.populate(PRODUCT_POPULATE);
  }

  let subtotal = 0;
  let itemCount = 0;

  const items = cart.items.map((item) => {
    const { product } = item;
    const info = purchaseInfo(product, item.variantId);
    // "available" = this exact line (including its quantity) can be bought right now.
    const available = !info.problem && item.quantity <= info.maxQuantity;
    const lineTotal = round2(info.unitPrice * item.quantity);
    if (available) subtotal += lineTotal;
    itemCount += item.quantity;

    return {
      _id: item._id,
      product: {
        _id: product._id,
        name: product.name,
        slug: product.slug,
        images: product.images,
        priceUnit: product.priceUnit,
        isAvailable: product.isAvailable,
        inStock: product.inStock,
        hasVariants: product.hasVariants,
        category: product.category ? { name: product.category.name, slug: product.category.slug } : null,
      },
      variantId: item.variantId ?? null,
      size: info.variant?.size ?? null,
      colour: item.colour ?? '',
      quantity: item.quantity,
      customisation: {
        instructions: item.customisation?.instructions ?? '',
        message: item.customisation?.message ?? '',
      },
      unitPrice: info.unitPrice,
      lineTotal,
      available,
      maxQuantity: info.maxQuantity,
    };
  });

  return { items, subtotal: round2(subtotal), itemCount };
}
