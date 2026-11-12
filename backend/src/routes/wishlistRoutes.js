import { Router } from 'express';
import { addToWishlist, getWishlist, mergeWishlist, removeFromWishlist } from '../controllers/wishlistController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { mergeWishlistBody, wishlistBody, wishlistParams } from '../validators/wishlist.js';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(getWishlist));
router.post('/', validate({ body: wishlistBody }), asyncHandler(addToWishlist));
router.post('/merge', validate({ body: mergeWishlistBody }), asyncHandler(mergeWishlist));
router.delete('/:productId', validate({ params: wishlistParams }), asyncHandler(removeFromWishlist));

export default router;
