import { Router } from 'express';
import { uploadImages } from '../controllers/adminController.js';
import { getConfig, health, submitContact, subscribeNewsletter } from '../controllers/miscController.js';
import { getRecentReviews } from '../controllers/reviewController.js';
import { requireAdmin } from '../middleware/auth.js';
import { authLimiter, contactLimiter, newsletterLimiter } from '../middleware/rateLimiters.js';
import { validate } from '../middleware/validate.js';
import { storage } from '../services/storage/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { contactBody, newsletterBody } from '../validators/misc.js';
import { recentReviewsQuery } from '../validators/review.js';
import adminRoutes from './adminRoutes.js';
import authRoutes from './authRoutes.js';
import cartRoutes from './cartRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import orderRoutes from './orderRoutes.js';
import productRoutes from './productRoutes.js';
import wishlistRoutes from './wishlistRoutes.js';

const router = Router();

// Public config
router.get('/health', health);
router.get('/config', getConfig);

router.use('/auth', authLimiter, authRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.get('/reviews/recent', validate({ query: recentReviewsQuery }), asyncHandler(getRecentReviews));
router.use('/cart', cartRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/orders', orderRoutes);
router.use('/admin', adminRoutes);

// Admin image upload (multipart field "images"). Auth runs before any file is accepted.
router.post('/uploads', requireAdmin, storage.receive, asyncHandler(uploadImages));

// Misc
router.post('/newsletter/subscribe', newsletterLimiter, validate({ body: newsletterBody }), asyncHandler(subscribeNewsletter));
router.post('/contact', contactLimiter, validate({ body: contactBody }), asyncHandler(submitContact));

export default router;
