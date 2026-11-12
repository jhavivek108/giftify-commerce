import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { AUTH_COOKIE, verifyToken } from '../utils/token.js';

function readToken(req) {
  const header = req.headers.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    const token = header.slice(7).trim();
    if (token) return token;
  }
  return req.cookies?.[AUTH_COOKIE] || null;
}

/** Resolves the logged-in user from the request, or null. Never throws for a bad token. */
async function resolveUser(req) {
  const token = readToken(req);
  if (!token) return null;
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return null; // expired, malformed or signed with another secret
  }
  // Load the user on every request so deleted accounts and role changes take effect at once.
  return User.findById(payload.sub);
}

/** Attaches req.user when a valid token is present; guests pass through. */
export async function optionalAuth(req, res, next) {
  try {
    req.user = await resolveUser(req);
    next();
  } catch (error) {
    next(error);
  }
}

/** 401 unless a valid token is present. */
export async function requireAuth(req, res, next) {
  try {
    req.user = await resolveUser(req);
    if (!req.user) throw ApiError.unauthorized();
    next();
  } catch (error) {
    next(error);
  }
}

/** 401 for guests, 403 for logged-in users who are not admins. */
export async function requireAdmin(req, res, next) {
  try {
    req.user = await resolveUser(req);
    if (!req.user) throw ApiError.unauthorized();
    if (req.user.role !== 'admin') throw ApiError.forbidden('Admin access required');
    next();
  } catch (error) {
    next(error);
  }
}
