import { Link } from 'react-router-dom';
import { Quote } from 'lucide-react';
import { LoadingSpinner, Reveal, StarRating } from './ui';
import useAsync from '../hooks/useAsync';
import { reviewApi } from '../services/api';
import { formatDate } from '../utils/format';
import { THEMES } from '../utils/themes';

const TILES = [THEMES.pink.tile, THEMES.yellow.tile, THEMES.lavender.tile, THEMES.blue.tile, THEMES.mint.tile, THEMES.peach.tile];

/**
 * Shows real customer reviews from the database only.
 * When there are none yet, it says so instead of showing made-up testimonials.
 */
export default function Testimonials() {
  const { data, loading } = useAsync(() => reviewApi.recent(6), []);
  const reviews = data?.items || [];

  if (loading) return <LoadingSpinner label="Loading reviews…" />;

  if (reviews.length === 0) {
    return (
      <Reveal className="rounded-[32px] bg-white px-7 py-12 text-center sm:px-12">
        <Quote className="mx-auto text-blush" size={34} />
        <h3 className="mt-4 text-2xl sm:text-3xl">No reviews yet. Yours could be the first.</h3>
        <p className="mx-auto mt-3 max-w-md text-muted">Ordered something from us? Open the product page and tell us how it made you feel.</p>
        <Link to="/shop" className="btn btn-outline mt-6">
          Browse products
        </Link>
      </Reveal>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {reviews.map((review, i) => (
        <Reveal key={review._id} delay={(i % 3) * 0.06}>
          <figure className="flex h-full flex-col rounded-[28px] p-7" style={{ background: TILES[i % TILES.length] }}>
            <StarRating value={review.rating} />
            {review.title && <p className="mt-3 font-display text-xl font-bold">{review.title}</p>}
            <blockquote className="mt-2 flex-1 leading-relaxed">“{review.comment}”</blockquote>
            <figcaption className="mt-5 text-sm">
              <span className="font-bold">{review.user?.name || 'Customer'}</span>
              {review.product && (
                <>
                  {' '}
                  on{' '}
                  <Link to={`/product/${review.product.slug}`} className="underline">
                    {review.product.name}
                  </Link>
                </>
              )}
              <span className="block text-muted">{formatDate(review.createdAt)}</span>
            </figcaption>
          </figure>
        </Reveal>
      ))}
    </div>
  );
}
