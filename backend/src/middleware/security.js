import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const allowedOrigins = new Set(env.frontendUrls);

/** Options for the cors package: only FRONTEND_URL origins, with cookies. */
export const corsOptions = {
  origin(origin, callback) {
    // No Origin header = same-origin request, curl, server-to-server: nothing to allow.
    callback(null, !origin || allowedOrigins.has(origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
};

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence for the auth cookie (which is SameSite=None in production):
 * a state-changing request that carries an Origin header must come from an
 * allowed frontend origin. Browsers always send Origin on such requests.
 */
export function originCheck(req, res, next) {
  const { origin } = req.headers;
  if (!SAFE_METHODS.has(req.method) && origin && !allowedOrigins.has(origin)) {
    return next(ApiError.forbidden('This origin is not allowed to call the API'));
  }
  return next();
}

/** API responses are per-user and must not be cached by browsers or proxies. */
export function noStore(req, res, next) {
  res.setHeader('Cache-Control', 'no-store');
  next();
}
