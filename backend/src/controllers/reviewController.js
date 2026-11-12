import { Product } from '../models/Product.js';
import { Review } from '../models/Review.js';
import { recomputeProductRating } from '../services/reviewService.js';
import { ApiError } from '../utils/ApiError.js';
import { created, listPayload, ok, skipFor } from '../utils/response.js';

/** Review shape for the product page: the author is reduced to a name. */
const toPublicReview = (review) => ({
  _id: review._id,
  rating: review.rating,
  title: review.title,
  comment: review.comment,
  createdAt: review.createdAt,
  user: { name: review.user?.name ?? 'Customer' },
});

export async function getProductReviews(req, res) {
  const { id } = req.valid.params;
  const { page, limit } = req.valid.query;

  const product = await Product.findById(id).select('ratingAverage');
  if (!product) throw ApiError.notFound('Product not found');

  const [reviews, total] = await Promise.all([
    Review.find({ product: id }).sort({ createdAt: -1 }).skip(skipFor(page, limit)).limit(limit).populate('user', 'name'),
    Review.countDocuments({ product: id }),
  ]);

  ok(res, { ...listPayload(reviews.map(toPublicReview), total, page, limit), average: product.ratingAverage });
}

export async function createReview(req, res) {
  const { id } = req.valid.params;
  const { rating, title, comment } = req.valid.body;

  const product = await Product.findById(id).select('_id');
  if (!product) throw ApiError.notFound('Product not found');

  if (await Review.exists({ user: req.user._id, product: id })) {
    throw ApiError.conflict('You have already reviewed this product');
  }

  let review;
  try {
    review = await Review.create({ user: req.user._id, product: id, rating, title: title ?? '', comment });
  } catch (error) {
    // Two requests at once: the unique (user, product) index is the final guard.
    if (error?.code === 11000) throw ApiError.conflict('You have already reviewed this product');
    throw error;
  }
  await recomputeProductRating(product._id);

  review.user = req.user;
  created(res, { review: toPublicReview(review) }, 'Thank you for your review');
}

export async function getRecentReviews(req, res) {
  const { limit } = req.valid.query;

  // Fetch a few extra in case some belong to hidden products.
  const reviews = await Review.find()
    .sort({ createdAt: -1 })
    .limit(limit * 3)
    .populate('user', 'name')
    .populate('product', 'name slug images isAvailable');

  const items = reviews
    .filter((review) => review.product?.isAvailable)
    .slice(0, limit)
    .map((review) => ({
      ...toPublicReview(review),
      product: { name: review.product.name, slug: review.product.slug, images: review.product.images },
    }));
  ok(res, { items });
}

export async function deleteReview(req, res) {
  const { id } = req.valid.params;
  const review = await Review.findByIdAndDelete(id);
  if (!review) throw ApiError.notFound('Review not found');
  await recomputeProductRating(review.product);
  ok(res, { _id: id }, 'Review deleted');
}
