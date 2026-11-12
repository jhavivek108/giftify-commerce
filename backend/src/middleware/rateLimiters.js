import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const MINUTE = 60 * 1000;

/**
 * Limits only bite in production. In development, the demo and the smoke
 * test they are skipped so repeated local testing never gets a 429.
 */
function limiter({ windowMs, limit, message, ...rest }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => !env.isProd,
    handler: (req, res) => res.status(429).json({ success: false, message }),
    ...rest,
  });
}

/** Every /api request. */
export const globalLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 600,
  message: 'Too many requests. Please slow down and try again in a few minutes.',
});

/** All /api/auth/* routes (includes the frequent /me check). */
export const authLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 120,
  message: 'Too many requests. Please try again in a few minutes.',
});

/** Login and register: brute-force protection. Successful logins are not counted. */
export const credentialsLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
  message: 'Too many attempts. Please wait 15 minutes and try again.',
});

export const contactLimiter = limiter({
  windowMs: 60 * MINUTE,
  limit: 5,
  message: 'You have sent several messages already. Please try again later.',
});

export const newsletterLimiter = limiter({
  windowMs: 60 * MINUTE,
  limit: 10,
  message: 'Too many sign-up attempts. Please try again later.',
});

/** POST /api/orders */
export const orderLimiter = limiter({
  windowMs: 60 * MINUTE,
  limit: 20,
  message: 'Too many orders from this device. Please try again later or contact us on WhatsApp.',
});
