import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const AUTH_COOKIE = 'lgs_token';

export function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, {
    expiresIn: /^\d+$/.test(env.jwtExpiresIn) ? Number(env.jwtExpiresIn) : env.jwtExpiresIn,
  });
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

function cookieOptions() {
  // In production the frontend and API usually live on different domains,
  // which requires SameSite=None and therefore Secure (HTTPS).
  return {
    httpOnly: true,
    sameSite: env.isProd ? 'none' : 'lax',
    secure: env.isProd,
    path: '/',
  };
}

export function setAuthCookie(res, token) {
  const { exp } = jwt.decode(token);
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions(), expires: new Date(exp * 1000) });
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, cookieOptions());
}
