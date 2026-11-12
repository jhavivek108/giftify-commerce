import { Router } from 'express';
import {
  addToCart,
  clearCart,
  getCart,
  mergeCart,
  removeCartItem,
  updateCartItem,
} from '../controllers/cartController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { addCartItemBody, cartItemParams, mergeCartBody, updateCartItemBody } from '../validators/cart.js';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(getCart));
router.post('/', validate({ body: addCartItemBody }), asyncHandler(addToCart));
router.delete('/', asyncHandler(clearCart));
router.post('/merge', validate({ body: mergeCartBody }), asyncHandler(mergeCart));
router.put('/:itemId', validate({ params: cartItemParams, body: updateCartItemBody }), asyncHandler(updateCartItem));
router.delete('/:itemId', validate({ params: cartItemParams }), asyncHandler(removeCartItem));

export default router;
