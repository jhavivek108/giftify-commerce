import { z } from 'zod';
import { objectId } from './common.js';

export const wishlistBody = z.object({ productId: objectId });

export const wishlistParams = z.object({ productId: objectId });

// Invalid ids are skipped in the controller rather than failing the merge.
export const mergeWishlistBody = z.object({
  productIds: z.array(z.unknown()).max(200, 'At most 200 products'),
});
