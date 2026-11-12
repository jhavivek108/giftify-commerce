import { Router } from 'express';
import { cancelMyOrder, getMyOrders, getOrder, placeOrder } from '../controllers/orderController.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { orderLimiter } from '../middleware/rateLimiters.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { idParams } from '../validators/common.js';
import { createOrderBody } from '../validators/order.js';

const router = Router();

router.post('/', orderLimiter, optionalAuth, validate({ body: createOrderBody }), asyncHandler(placeOrder));
router.get('/my-orders', requireAuth, asyncHandler(getMyOrders));
router.get('/:id', requireAuth, validate({ params: idParams }), asyncHandler(getOrder));
router.patch('/:id/cancel', requireAuth, validate({ params: idParams }), asyncHandler(cancelMyOrder));

export default router;
