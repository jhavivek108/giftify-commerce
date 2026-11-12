import { ApiError } from '../utils/ApiError.js';

const valueAt = (input, path) => path.reduce((value, key) => (value == null ? undefined : value[key]), input);

/** Zod issues -> [{ path: 'customer.email', message }] with a friendlier "required" message. */
export function formatZodIssues(issues, input) {
  return issues.map((issue) => {
    const missing =
      input !== undefined && issue.code === 'invalid_type' && valueAt(input, issue.path) === undefined;
    return {
      path: issue.path.join('.'),
      message: missing ? 'This field is required' : issue.message,
    };
  });
}

// "?minPrice=&search=" should behave as if the parameters were not sent.
function withoutBlanks(query) {
  const result = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== '') result[key] = value;
  }
  return result;
}

/**
 * Validates request parts with Zod: validate({ params, query, body }).
 * The parsed (trimmed, coerced, unknown-keys-stripped) values are placed on
 * req.valid.params / req.valid.query / req.valid.body. Controllers must read
 * from req.valid, never from the raw request.
 */
export const validate = (schemas) => (req, res, next) => {
  const errors = [];
  const valid = {};

  for (const part of ['params', 'query', 'body']) {
    const schema = schemas[part];
    if (!schema) continue;
    const input = part === 'query' ? withoutBlanks(req.query ?? {}) : (req[part] ?? {});
    const result = schema.safeParse(input);
    if (result.success) valid[part] = result.data;
    else errors.push(...formatZodIssues(result.error.issues, input));
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest('Please check the highlighted fields and try again.', errors));
  }
  req.valid = valid;
  if (valid.body !== undefined) req.body = valid.body;
  return next();
};
