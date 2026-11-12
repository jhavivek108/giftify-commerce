import mongoose from 'mongoose';
import multer from 'multer';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { formatZodIssues } from './validate.js';

/** 404 for any route that no router handled. */
export function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.path}`));
}

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: 'Each image must be 5 MB or smaller',
  LIMIT_FILE_COUNT: 'You can upload at most 6 images at a time',
  LIMIT_UNEXPECTED_FILE: 'Unexpected file field. Send images in the "images" field (max 6)',
};

/** Turns any thrown value into { status, message, errors? }. */
function normalise(error) {
  if (error instanceof ApiError) {
    return { status: error.status, message: error.message, errors: error.errors };
  }
  if (error instanceof ZodError) {
    return { status: 400, message: 'Please check the highlighted fields and try again.', errors: formatZodIssues(error.issues) };
  }
  if (error instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(error.errors).map((item) => ({
      path: item.path,
      message: item instanceof mongoose.Error.CastError ? `Invalid value for ${item.path}` : item.message,
    }));
    return { status: 400, message: 'Please check the highlighted fields and try again.', errors };
  }
  if (error instanceof mongoose.Error.CastError) {
    return { status: 400, message: `Invalid value for ${error.path}`, errors: [{ path: error.path, message: 'Invalid value' }] };
  }
  if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern ?? error.keyValue ?? {})[0] ?? 'value';
    return {
      status: 409,
      message: `That ${field} is already in use`,
      errors: [{ path: field, message: 'Already in use' }],
    };
  }
  if (error instanceof multer.MulterError) {
    return { status: 400, message: MULTER_MESSAGES[error.code] ?? 'Upload failed', errors: [{ path: error.field ?? 'images', message: error.message }] };
  }
  if (error?.name === 'TokenExpiredError' || error?.name === 'JsonWebTokenError') {
    return { status: 401, message: 'Your session has expired. Please log in again' };
  }
  // Errors raised by express.json()
  if (error?.type === 'entity.parse.failed') return { status: 400, message: 'The request body is not valid JSON' };
  if (error?.type === 'entity.too.large') return { status: 413, message: 'The request body is too large' };

  return { status: 500, message: 'Something went wrong on our side. Please try again.', unexpected: true };
}

/** Central error handler. Always answers with the error envelope. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  const { status, message, errors, unexpected } = normalise(error);

  if (unexpected) {
    // Log for the operator. Request bodies are never logged.
    console.error(`[error] ${req.method} ${req.path}:`, error);
  }

  const body = { success: false, message };
  if (errors?.length) body.errors = errors;
  // Extra detail for developers only; never sent in production.
  if (unexpected && !env.isProd) {
    body.message = error?.message || message;
    body.stack = error?.stack;
  }

  if (res.headersSent) return next(error);
  return res.status(status).json(body);
}
