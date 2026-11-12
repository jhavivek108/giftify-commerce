import mongoose from 'mongoose';

const { Decimal128 } = mongoose.Types;

/** Decimal128 | number | string | null -> plain JS number (rupees). */
export function toNumber(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'number') return value;
  return Number(value.toString());
}

/** number | string -> Decimal128 rounded to paise. Other values pass through. */
export function toDecimal(value) {
  if (value === null || value === undefined || value instanceof Decimal128) return value;
  if (typeof value !== 'number' && typeof value !== 'string') return value;
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return Decimal128.fromString(number.toFixed(2));
}

/** Rounds a JS number to 2 decimal places, avoiding float drift in sums. */
export const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Schema definition for a money field: stored as Decimal128, read as a number.
 * Usage: price: money({ required: true })
 */
export function money(options = {}) {
  return {
    type: mongoose.Schema.Types.Decimal128,
    get: toNumber,
    set: toDecimal,
    validate: {
      validator: (value) => value === null || value === undefined || toNumber(value) >= 0,
      message: 'Amount cannot be negative',
    },
    ...options,
  };
}

/**
 * JSON replacer registered on the Express app. Any Decimal128 that reaches a
 * response without passing through a schema getter (aggregations, lean
 * queries) still goes out as a plain number.
 */
export function decimalReplacer(key, value) {
  if (value && typeof value === 'object' && typeof value.$numberDecimal === 'string') {
    return Number(value.$numberDecimal);
  }
  return value;
}
