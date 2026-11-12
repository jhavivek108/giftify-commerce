/**
 * NoSQL-injection guard (replacement for express-mongo-sanitize, which does
 * not work on Express 5 because req.query is a read-only getter).
 *
 * Removes, in place and recursively, every key that starts with "$" or
 * contains "." from req.body and req.params, so payloads like
 * { "email": { "$gt": "" } } can never reach a MongoDB query. Prototype
 * pollution keys are dropped too. req.query is validated by Zod instead.
 */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const isUnsafeKey = (key) => key.startsWith('$') || key.includes('.') || FORBIDDEN_KEYS.has(key);

export function stripUnsafeKeys(value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 20) return value;
  if (Array.isArray(value)) {
    for (const item of value) stripUnsafeKeys(item, depth + 1);
    return value;
  }
  for (const key of Object.keys(value)) {
    if (isUnsafeKey(key)) delete value[key];
    else stripUnsafeKeys(value[key], depth + 1);
  }
  return value;
}

export function sanitize(req, res, next) {
  stripUnsafeKeys(req.body);
  stripUnsafeKeys(req.params);
  next();
}
