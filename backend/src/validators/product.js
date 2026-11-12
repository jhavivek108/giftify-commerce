import { z } from 'zod';
import { limitQuery, objectId, optionalField, optionalObjectId, pageQuery, queryBoolean, searchQuery } from './common.js';

export const PRODUCT_SORTS = ['featured', 'price_asc', 'price_desc', 'name_asc', 'name_desc', 'newest'];

const priceQuery = z.coerce.number({ error: 'Must be a number' }).min(0).optional();

const listQuery = (defaultLimit) =>
  z.object({
    category: z.string().trim().toLowerCase().max(80).optional(),
    search: searchQuery,
    minPrice: priceQuery,
    maxPrice: priceQuery,
    available: queryBoolean,
    featured: queryBoolean,
    sort: z.enum(PRODUCT_SORTS, { error: `Sort must be one of: ${PRODUCT_SORTS.join(', ')}` }).default('featured'),
    page: pageQuery,
    limit: limitQuery(defaultLimit),
  });

export const productListQuery = listQuery(24);
export const adminProductListQuery = listQuery(100);

export const slugParams = z.object({
  slug: z.string().trim().toLowerCase().min(1).max(120),
});

const price = z.number({ error: 'Price must be a number' }).min(0, 'Price cannot be negative').max(1000000);
const stock = z.number({ error: 'Stock must be a number' }).int('Stock must be a whole number').min(0).max(100000);
// Site-relative path (/uploads/x.webp, /images/...) or an http(s) URL.
const imageUrl = z
  .string()
  .trim()
  .max(500)
  .regex(/^(\/[^/\\]|https?:\/\/)/i, 'Image URL must start with / or http(s)://');

const fields = {
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  slug: optionalField(
    z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes only')
      .max(120),
  ),
  description: z.string().trim().max(4000).optional(),
  category: objectId,
  basePrice: price.optional(),
  priceUnit: z.string().trim().min(1).max(40).optional(),
  images: z
    .array(z.object({ url: imageUrl, alt: z.string().trim().max(200).optional() }))
    .max(12, 'At most 12 images')
    .optional(),
  colours: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(40),
        hex: optionalField(z.string().trim().regex(/^#[0-9a-f]{6}$/i, 'Use a hex colour like #F28FB1')),
      }),
    )
    .max(20)
    .optional(),
  variants: z
    .array(
      z.object({
        _id: optionalObjectId, // send it back when editing so carts keep pointing at the same variant
        size: z.string().trim().min(1, 'Size is required').max(40),
        price,
        stock: stock.optional(),
        isAvailable: z.boolean().optional(),
      }),
    )
    .max(20)
    .optional(),
  customisable: z.boolean().optional(),
  stock: stock.optional(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
};

export const createProductBody = z.object(fields).superRefine((body, ctx) => {
  if (!body.variants?.length && body.basePrice === undefined) {
    ctx.addIssue({ code: 'custom', path: ['basePrice'], message: 'Price is required when the product has no size variants' });
  }
});

export const updateProductBody = z.object({
  ...fields,
  name: fields.name.optional(),
  category: fields.category.optional(),
});
