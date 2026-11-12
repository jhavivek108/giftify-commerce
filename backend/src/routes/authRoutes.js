import { Router } from 'express';
import { login, logout, me, register } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { credentialsLimiter } from '../middleware/rateLimiters.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loginBody, registerBody } from '../validators/auth.js';

const router = Router();

router.post('/register', credentialsLimiter, validate({ body: registerBody }), asyncHandler(register));
router.post('/login', credentialsLimiter, validate({ body: loginBody }), asyncHandler(login));
router.post('/logout', asyncHandler(logout));
router.get('/me', requireAuth, asyncHandler(me));

export default router;
