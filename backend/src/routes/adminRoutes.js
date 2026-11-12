import { Router } from 'express';
import {
  getCustomer,
  getCustomers,
  getDashboard,
  getMessages,
  markMessageRead,
} from '../controllers/adminController.js';
import {
  getAdminOrder,
  getAdminOrders,
  updateOrderPayment,
  updateOrderStatus,
} from '../controllers/orderController.js';
import { getAdminProducts } from '../controllers/productController.js';
import { deleteReview } from '../controllers/reviewController.js';
import { requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { idParams } from '../validators/common.js';
import { customerListQuery, messageListQuery } from '../validators/misc.js';
import { adminOrderListQuery, updateOrderPaymentBody, updateOrderStatusBody } from '../validators/order.js';
import { adminProductListQuery } from '../validators/product.js';

const router = Router();

// Everything under /api/admin needs an admin: 401 for guests, 403 for customers.
router.use(requireAdmin);

router.get('/dashboard', asyncHandler(getDashboard));

router.get('/products', validate({ query: adminProductListQuery }), asyncHandler(getAdminProducts));

router.get('/orders', validate({ query: adminOrderListQuery }), asyncHandler(getAdminOrders));
router.get('/orders/:id', validate({ params: idParams }), asyncHandler(getAdminOrder));
router.patch(
  '/orders/:id/status',
  validate({ params: idParams, body: updateOrderStatusBody }),
  asyncHandler(updateOrderStatus),
);
router.patch(
  '/orders/:id/payment',
  validate({ params: idParams, body: updateOrderPaymentBody }),
  asyncHandler(updateOrderPayment),
);

router.get('/customers', validate({ query: customerListQuery }), asyncHandler(getCustomers));
router.get('/customers/:id', validate({ params: idParams }), asyncHandler(getCustomer));

router.get('/messages', validate({ query: messageListQuery }), asyncHandler(getMessages));
router.patch('/messages/:id/read', validate({ params: idParams }), asyncHandler(markMessageRead));

router.delete('/reviews/:id', validate({ params: idParams }), asyncHandler(deleteReview));

export default router;
