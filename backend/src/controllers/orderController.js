import { Order } from '../models/Order.js';
import { changeOrderStatus, createOrder, updatePayment } from '../services/orderService.js';
import { ApiError } from '../utils/ApiError.js';
import { created, listPayload, ok, skipFor } from '../utils/response.js';
import { escapeRegex } from '../utils/text.js';

/** POST /api/orders - guests and logged-in customers. */
export async function placeOrder(req, res) {
  const order = await createOrder(req.valid.body, req.user ?? null);
  created(res, { order }, 'Order placed');
}

export async function getMyOrders(req, res) {
  const items = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  ok(res, { items });
}

/** Owner or admin. Anyone else gets 404, so order ids cannot be probed. */
export async function getOrder(req, res) {
  const order = await Order.findById(req.valid.params.id);
  const isOwner = order?.user && String(order.user) === String(req.user._id);
  if (!order || (!isOwner && req.user.role !== 'admin')) throw ApiError.notFound('Order not found');
  ok(res, { order });
}

/** Customers can cancel their own order while it is still "placed". */
export async function cancelMyOrder(req, res) {
  const isAdmin = req.user.role === 'admin';
  const order = await changeOrderStatus({
    orderId: req.valid.params.id,
    status: 'cancelled',
    note: isAdmin ? 'Cancelled by admin' : 'Cancelled by customer',
    actor: req.user,
    ownerId: isAdmin ? undefined : req.user._id,
    allowedFrom: isAdmin ? undefined : ['placed'],
  });
  ok(res, { order }, 'Order cancelled');
}

// ----- Admin -----

export async function getAdminOrders(req, res) {
  const { status, paymentStatus, search, page, limit } = req.valid.query;
  const filter = {};
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ orderNumber: pattern }, { 'customer.fullName': pattern }, { 'customer.phone': pattern }];
  }

  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skipFor(page, limit)).limit(limit),
    Order.countDocuments(filter),
  ]);
  ok(res, listPayload(items, total, page, limit));
}

export async function getAdminOrder(req, res) {
  const order = await Order.findById(req.valid.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  ok(res, { order });
}

export async function updateOrderStatus(req, res) {
  const { status, note } = req.valid.body;
  const order = await changeOrderStatus({ orderId: req.valid.params.id, status, note, actor: req.user });
  ok(res, { order }, `Order marked as ${status}`);
}

export async function updateOrderPayment(req, res) {
  const { paymentStatus, reference, note } = req.valid.body;
  const order = await updatePayment({ orderId: req.valid.params.id, paymentStatus, reference, note, actor: req.user });
  ok(res, { order }, `Payment marked as ${paymentStatus}`);
}
