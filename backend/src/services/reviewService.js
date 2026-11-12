import { Product } from '../models/Product.js';
import { Review } from '../models/Review.js';

/** Recomputes a product's ratingAverage (1 decimal) and ratingCount from its reviews. */
export async function recomputeProductRating(productId) {
  const [stats] = await Review.aggregate([
    { $match: { product: productId } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const ratingAverage = stats ? Math.round(stats.average * 10) / 10 : 0;
  const ratingCount = stats?.count ?? 0;
  await Product.updateOne({ _id: productId }, { $set: { ratingAverage, ratingCount } });
  return { ratingAverage, ratingCount };
}
