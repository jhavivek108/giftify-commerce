import { Category } from '../models/Category.js';
import { IN_STOCK_FILTER, Product } from '../models/Product.js';
import { MAX_LINE_QUANTITY } from '../utils/constants.js';
import { listPayload, skipFor } from '../utils/response.js';
import { escapeRegex } from '../utils/text.js';

/** Category fields embedded in every product response. */
export const CATEGORY_FIELDS = 'name slug theme';

const SORTS = {
  featured: { isFeatured: -1, sortOrder: 1, createdAt: 1, _id: 1 },
  price_asc: { basePrice: 1, name: 1, _id: 1 },
  price_desc: { basePrice: -1, name: 1, _id: 1 },
  name_asc: { name: 1, _id: 1 },
  name_desc: { name: -1, _id: 1 },
  newest: { createdAt: -1, _id: -1 },
};

/**
 * Product listing shared by the public and the admin endpoint.
 * Public: only available products in active categories.
 * Admin: everything.
 */
export async function listProducts(query, { admin = false } = {}) {
  const { category, search, minPrice, maxPrice, available, featured, sort, page, limit } = query;
  const empty = listPayload([], 0, page, limit);
  const categoryScope = admin ? {} : { isActive: true };
  const conditions = [];

  if (!admin) conditions.push({ isAvailable: true });

  if (category) {
    const match = await Category.findOne({ slug: category, ...categoryScope }).select('_id');
    if (!match) return empty;
    conditions.push({ category: match._id });
  } else if (!admin) {
    conditions.push({ category: { $in: await Category.find(categoryScope).distinct('_id') } });
  }

  if (search) {
    // Every word must match the product name or its category name (partial, case-insensitive).
    const words = search.split(/\s+/).filter(Boolean).slice(0, 6);
    for (const word of words) {
      const pattern = new RegExp(escapeRegex(word), 'i');
      const categoryIds = await Category.find({ name: pattern, ...categoryScope }).distinct('_id');
      conditions.push({ $or: [{ name: pattern }, { category: { $in: categoryIds } }] });
    }
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    const range = {};
    if (minPrice !== undefined) range.$gte = minPrice;
    if (maxPrice !== undefined) range.$lte = maxPrice;
    conditions.push({ basePrice: range });
  }

  if (available) conditions.push({ isAvailable: true }, IN_STOCK_FILTER);
  if (featured) conditions.push({ isFeatured: true });

  const filter = conditions.length > 0 ? { $and: conditions } : {};
  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort(SORTS[sort] ?? SORTS.featured)
      .collation({ locale: 'en', strength: 2 }) // case-insensitive name ordering
      .skip(skipFor(page, limit))
      .limit(limit)
      .populate('category', CATEGORY_FIELDS),
    Product.countDocuments(filter),
  ]);

  return listPayload(items, total, page, limit);
}

/** Customer-facing explanations for why a line cannot be bought. */
export const LINE_PROBLEMS = {
  not_found: 'This product is no longer available',
  unavailable: 'This product is currently unavailable',
  variant_required: 'Please choose a size',
  variant_not_found: 'The selected size is no longer available',
  variant_unavailable: 'The selected size is currently unavailable',
  variant_not_allowed: 'This product does not come in sizes',
  out_of_stock: 'This item is out of stock',
};

/**
 * Works out whether (product, variantId) can be bought and at what price.
 * This is the single place where prices are read for carts and orders.
 * `product.category` may be populated (then an inactive category blocks the sale).
 *
 * Returns { variant, unitPrice, stock, maxQuantity, problem } where `problem`
 * is null or a key of LINE_PROBLEMS.
 */
export function purchaseInfo(product, variantId) {
  if (!product) return { variant: null, unitPrice: 0, stock: 0, maxQuantity: 0, problem: 'not_found' };

  const hasVariants = product.variants.length > 0;
  const categoryInactive = product.category && product.category.isActive === false;
  let variant = null;
  let problem = null;

  if (!product.isAvailable || categoryInactive) problem = 'unavailable';

  if (hasVariants) {
    if (!variantId) problem ??= 'variant_required';
    else {
      variant = product.variants.id(variantId);
      if (!variant) problem ??= 'variant_not_found';
      else if (!variant.isAvailable) problem ??= 'variant_unavailable';
    }
  } else if (variantId) {
    problem ??= 'variant_not_allowed';
  }

  const stock = hasVariants ? (variant?.stock ?? 0) : product.stock;
  if (!problem && stock < 1) problem = 'out_of_stock';

  return {
    variant,
    unitPrice: variant ? variant.price : product.basePrice,
    stock,
    maxQuantity: problem ? 0 : Math.min(MAX_LINE_QUANTITY, stock),
    problem,
  };
}
