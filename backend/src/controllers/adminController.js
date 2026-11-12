import { ContactMessage } from '../models/ContactMessage.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { storage } from '../services/storage/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ORDER_STATUSES } from '../utils/constants.js';
import { toNumber } from '../utils/money.js';
import { created, listPayload, ok, skipFor } from '../utils/response.js';
import { escapeRegex } from '../utils/text.js';

export async function getDashboard(req, res) {
  const [byStatus, [paid], totalProducts, totalCustomers, recentOrders] = await Promise.all([
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$total' } } }]),
    Order.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, revenue: { $sum: '$total' } } }]),
    Product.countDocuments(),
    User.countDocuments({ role: 'customer' }),
    Order.find().sort({ createdAt: -1 }).limit(8),
  ]);

  const ordersByStatus = Object.fromEntries(ORDER_STATUSES.map((status) => [status, 0]));
  let totalOrders = 0;
  let totalRevenue = 0;
  for (const row of byStatus) {
    ordersByStatus[row._id] = row.count;
    totalOrders += row.count;
    if (row._id !== 'cancelled') totalRevenue += toNumber(row.revenue);
  }

  ok(res, {
    totalRevenue, // every order that is not cancelled
    paidRevenue: toNumber(paid?.revenue) ?? 0, // orders an admin has marked as paid
    totalOrders,
    pendingOrders: totalOrders - ordersByStatus.delivered - ordersByStatus.cancelled,
    completedOrders: ordersByStatus.delivered,
    cancelledOrders: ordersByStatus.cancelled,
    totalProducts,
    totalCustomers,
    ordersByStatus,
    recentOrders,
  });
}

/** orderCount = all orders; totalSpent = total of the non-cancelled ones. */
async function orderStatsFor(userIds) {
  const rows = await Order.aggregate([
    { $match: { user: { $in: userIds } } },
    {
      $group: {
        _id: '$user',
        orderCount: { $sum: 1 },
        totalSpent: { $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, '$total', 0] } },
      },
    },
  ]);
  return new Map(rows.map((row) => [String(row._id), { orderCount: row.orderCount, totalSpent: toNumber(row.totalSpent) }]));
}

const toCustomer = (user, stats) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  createdAt: user.createdAt,
  orderCount: stats?.orderCount ?? 0,
  totalSpent: stats?.totalSpent ?? 0,
});

export async function getCustomers(req, res) {
  const { search, page, limit } = req.valid.query;
  const filter = { role: 'customer' };
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skipFor(page, limit)).limit(limit),
    User.countDocuments(filter),
  ]);
  const stats = await orderStatsFor(users.map((user) => user._id));

  ok(res, listPayload(users.map((user) => toCustomer(user, stats.get(String(user._id)))), total, page, limit));
}

export async function getCustomer(req, res) {
  const user = await User.findOne({ _id: req.valid.params.id, role: 'customer' });
  if (!user) throw ApiError.notFound('Customer not found');

  const [stats, orders] = await Promise.all([
    orderStatsFor([user._id]),
    Order.find({ user: user._id }).sort({ createdAt: -1 }),
  ]);
  ok(res, { customer: toCustomer(user, stats.get(String(user._id))), orders });
}

export async function getMessages(req, res) {
  const { type, unread, page, limit } = req.valid.query;
  const filter = {};
  if (type) filter.type = type;
  if (unread) filter.isRead = false;

  const [items, total, unreadCount] = await Promise.all([
    ContactMessage.find(filter).sort({ createdAt: -1 }).skip(skipFor(page, limit)).limit(limit),
    ContactMessage.countDocuments(filter),
    ContactMessage.countDocuments({ isRead: false }),
  ]);
  ok(res, { ...listPayload(items, total, page, limit), unreadCount });
}

export async function markMessageRead(req, res) {
  const item = await ContactMessage.findByIdAndUpdate(req.valid.params.id, { $set: { isRead: true } }, { new: true });
  if (!item) throw ApiError.notFound('Message not found');
  ok(res, { item }, 'Marked as read');
}

/** POST /api/uploads - files were already received by the storage middleware. */
export async function uploadImages(req, res) {
  if (!req.files?.length) {
    throw ApiError.badRequest('No images were uploaded', [{ path: 'images', message: 'Choose at least one image' }]);
  }
  const files = await storage.store(req.files);
  created(res, { files }, `${files.length} image${files.length === 1 ? '' : 's'} uploaded`);
}
