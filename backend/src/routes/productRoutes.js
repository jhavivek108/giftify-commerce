import { Router } from 'express';
import {
  createProduct,
  deleteProduct,
  getProductBySlug,
  getProducts,
  updateProduct,
} from '../controllers/productController.js';
import { createReview, getProductReviews } from '../controllers/reviewController.js';
import { optionalAuth, requireAdmin, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { idParams } from '../validators/common.js';
import { createProductBody, productListQuery, slugParams, updateProductBody } from '../validators/product.js';
import { createReviewBody, reviewListQuery } from '../validators/review.js';

const router = Router();

router.get('/', validate({ query: productListQuery }), asyncHandler(getProducts));

router.get('/:id/reviews', validate({ params: idParams, query: reviewListQuery }), asyncHandler(getProductReviews));
router.post('/:id/reviews', requireAuth, validate({ params: idParams, body: createReviewBody }), asyncHandler(createReview));

router.get('/:slug', optionalAuth, validate({ params: slugParams }), asyncHandler(getProductBySlug));

router.post('/', requireAdmin, validate({ body: createProductBody }), asyncHandler(createProduct));
router.put('/:id', requireAdmin, validate({ params: idParams, body: updateProductBody }), asyncHandler(updateProduct));
router.delete('/:id', requireAdmin, validate({ params: idParams }), asyncHandler(deleteProduct));

export default router;
