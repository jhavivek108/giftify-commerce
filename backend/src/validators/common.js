import { z } from 'zod';
import { MAX_LINE_QUANTITY } from '../utils/constants.js';

/** '' and null are treated as "not sent". */
const blankToUndefined = (value) => (value === '' || value === null ? undefined : value);

/** Wraps a schema so that '', null and undefined all mean "absent". */
export const optionalField = (schema) => z.preprocess(blankToUndefined, schema.optional());

export const objectId = z
  .string({ error: 'Must be a valid id' })
  .regex(/^[a-f\d]{24}$/i, 'Must be a valid id')
  .toLowerCase();

export const optionalObjectId = optionalField(objectId);

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Email is too long')
  .email('Enter a valid email address');

/**
 * Indian mobile number: 10 digits starting 6-9, with an optional +91 / 91
 * prefix. Spaces, dashes and brackets are ignored. Output: the 10 digits.
 */
export const indianPhone = z
  .string()
  .transform((value) => value.replace(/[\s\-()]/g, ''))
  .pipe(
    z
      .string()
      .regex(/^(?:\+?91)?[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')
      .transform((value) => value.slice(-10)),
  );

export const pinCode = z.preprocess(
  (value) => (typeof value === 'number' ? String(value) : value),
  z.string().trim().regex(/^\d{6}$/, 'PIN code must be 6 digits'),
);

/** Query-string boolean: "true" / "false". */
export const queryBoolean = z
  .enum(['true', 'false'], { error: 'Must be true or false' })
  .transform((value) => value === 'true')
  .optional();

export const pageQuery = z.coerce.number({ error: 'Must be a number' }).int().min(1).default(1);

/** limit with a default; values above `max` are clamped rather than rejected. */
export const limitQuery = (defaultLimit, max = 100) =>
  z.coerce
    .number({ error: 'Must be a number' })
    .int()
    .min(1)
    .default(defaultLimit)
    .transform((value) => Math.min(value, max));

export const searchQuery = z.string().trim().max(100).optional();

export const idParams = z.object({ id: objectId });

export const quantity = z
  .number({ error: 'Quantity must be a number' })
  .int('Quantity must be a whole number')
  .min(1, 'Quantity must be at least 1')
  .max(MAX_LINE_QUANTITY, `You can order at most ${MAX_LINE_QUANTITY} of one item`);

export const customisation = z.object({
  instructions: optionalField(z.string().trim().max(500, 'Instructions can be at most 500 characters')),
  message: optionalField(z.string().trim().max(300, 'Message can be at most 300 characters')),
});

/** One purchasable line, shared by cart and order endpoints. */
export const lineItem = z.object({
  productId: objectId,
  variantId: optionalObjectId,
  colour: optionalField(z.string().trim().max(60)),
  quantity,
  customisation: optionalField(customisation),
});
