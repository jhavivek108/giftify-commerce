import { z } from 'zod';
import { MAX_CART_LINES } from '../utils/constants.js';
import { customisation, lineItem, objectId, optionalField, quantity } from './common.js';

export const addCartItemBody = lineItem;

export const updateCartItemBody = z.object({
  quantity: quantity.optional(),
  // '' clears the colour, so blank is NOT treated as absent here.
  colour: z.string().trim().max(60).nullable().optional(),
  customisation: optionalField(customisation),
});

export const cartItemParams = z.object({ itemId: objectId });

// Lines are checked one by one in the controller: a bad line is skipped
// instead of failing the whole merge, so only the outer shape is validated here.
export const mergeCartBody = z.object({
  items: z.array(z.unknown()).max(MAX_CART_LINES, `At most ${MAX_CART_LINES} items`),
});
