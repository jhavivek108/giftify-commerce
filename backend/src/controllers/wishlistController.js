import { Product } from '../models/Product.js';
import { Wishlist } from '../models/Wishlist.js';
import { CATEGORY_FIELDS } from '../services/productService.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/response.js';
import { objectId } from '../validators/common.js';

const MAX_WISHLIST = 200;

async function wishlistResponse(userId) {
  const wishlist = await Wishlist.findOne({ user: userId }).populate({
    path: 'products',
    populate: { path: 'category', select: CATEGORY_FIELDS },
  });
  // Deleted products populate as null and are left out.
  return { items: (wishlist?.products ?? []).filter(Boolean) };
}

const addProducts = (userId, productIds) =>
  Wishlist.updateOne(
    { user: userId },
    { $addToSet: { products: { $each: productIds } }, $setOnInsert: { user: userId } },
    { upsert: true },
  );

export async function getWishlist(req, res) {
  ok(res, await wishlistResponse(req.user._id));
}

export async function addToWishlist(req, res) {
  const { productId } = req.valid.body;
  if (!(await Product.exists({ _id: productId }))) throw ApiError.notFound('Product not found');

  const current = await Wishlist.findOne({ user: req.user._id }).select('products');
  if ((current?.products.length ?? 0) >= MAX_WISHLIST) {
    throw ApiError.unprocessable(`Your wishlist can hold at most ${MAX_WISHLIST} products`);
  }

  await addProducts(req.user._id, [productId]);
  ok(res, await wishlistResponse(req.user._id), 'Added to wishlist');
}

export async function removeFromWishlist(req, res) {
  await Wishlist.updateOne({ user: req.user._id }, { $pull: { products: req.valid.params.productId } });
  ok(res, await wishlistResponse(req.user._id), 'Removed from wishlist');
}

/** Merges a guest's browser wishlist after login. Unknown or invalid ids are skipped. */
export async function mergeWishlist(req, res) {
  const ids = req.valid.body.productIds
    .map((raw) => objectId.safeParse(raw))
    .filter((result) => result.success)
    .map((result) => result.data);

  if (ids.length > 0) {
    const existing = await Product.find({ _id: { $in: ids } }).distinct('_id');
    const current = await Wishlist.findOne({ user: req.user._id }).select('products');
    const room = Math.max(0, MAX_WISHLIST - (current?.products.length ?? 0));
    if (existing.length > 0 && room > 0) await addProducts(req.user._id, existing.slice(0, room));
  }
  ok(res, await wishlistResponse(req.user._id), 'Wishlist merged');
}
