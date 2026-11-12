import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, ShoppingBag } from 'lucide-react';
import ProductGallery from '../components/ProductGallery';
import ProductGrid from '../components/ProductGrid';
import WishlistButton from '../components/WishlistButton';
import CustomisationForm, { emptySelection, selectedVariant, selectionPrice } from '../components/CustomisationForm';
import { Badge, ErrorMessage, LoadingSpinner, SectionHeading, StarRating, WhatsAppIcon } from '../components/ui';
import useAsync from '../hooks/useAsync';
import { productApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { fieldErrors, formatDate, priceWithUnit } from '../utils/format';
import { themeOf } from '../utils/themes';
import { buildOrderMessage, whatsappLink } from '../utils/whatsapp';

function Reviews({ product }) {
  const { user } = useAuth();
  const { success } = useToast();
  const { data, loading, reload } = useAsync(() => productApi.reviews(product._id), [product._id]);
  const [form, setForm] = useState({ rating: 5, title: '', comment: '' });
  const [state, setState] = useState({ saving: false, error: null });
  const reviews = data?.items || [];
  const errors = fieldErrors(state.error);

  const submit = async (e) => {
    e.preventDefault();
    setState({ saving: true, error: null });
    try {
      await productApi.addReview(product._id, { rating: form.rating, title: form.title.trim() || undefined, comment: form.comment.trim() });
      success('Thank you for your review!');
      setForm({ rating: 5, title: '', comment: '' });
      setState({ saving: false, error: null });
      reload();
    } catch (error) {
      setState({ saving: false, error });
    }
  };

  return (
    <section className="mt-16 grid gap-8 lg:grid-cols-12" aria-labelledby="reviews-title">
      <div className="lg:col-span-7">
        <h2 id="reviews-title" className="text-3xl">
          Customer reviews
        </h2>
        {loading ? (
          <LoadingSpinner label="Loading reviews…" />
        ) : reviews.length === 0 ? (
          <p className="mt-4 rounded-3xl bg-white px-6 py-8 text-muted">No reviews for this product yet.</p>
        ) : (
          <>
            <p className="mt-2 flex items-center gap-2 text-muted">
              <StarRating value={data.average} /> {Number(data.average).toFixed(1)} out of 5 · {data.total} {data.total === 1 ? 'review' : 'reviews'}
            </p>
            <ul className="mt-5 space-y-4">
              {reviews.map((r) => (
                <li key={r._id} className="rounded-3xl bg-white p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StarRating value={r.rating} />
                    <span className="text-sm text-muted">{formatDate(r.createdAt)}</span>
                  </div>
                  {r.title && <p className="mt-2 font-display text-lg font-bold">{r.title}</p>}
                  <p className="mt-1 leading-relaxed">{r.comment}</p>
                  <p className="mt-3 text-sm font-bold">{r.user?.name || 'Customer'}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="lg:col-span-5">
        <div className="surface p-6 sm:p-8">
          <h3 className="text-2xl">Write a review</h3>
          {!user ? (
            <p className="mt-3 text-muted">
              Please{' '}
              <Link to="/login" state={{ from: `/product/${product.slug}` }} className="font-bold text-olive underline">
                sign in
              </Link>{' '}
              to share your experience.
            </p>
          ) : (
            <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
              <div>
                <span className="label">Your rating</span>
                <StarRating value={form.rating} size={26} onChange={(rating) => setForm({ ...form, rating })} />
              </div>
              <div>
                <label className="label" htmlFor="review-title">
                  Title <span className="font-medium text-muted">(optional)</span>
                </label>
                <input id="review-title" className="input" maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="review-comment">
                  Your review
                </label>
                <textarea id="review-comment" required className="input min-h-28" maxLength={1000} aria-invalid={Boolean(errors.comment)} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
                {errors.comment && <p className="field-error">{errors.comment}</p>}
              </div>
              {state.error && !errors.comment && <p className="field-error">{state.error.message}</p>}
              <button className="btn btn-primary" disabled={state.saving || !form.comment.trim()}>
                {state.saving ? 'Sending…' : 'Submit review'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function Details({ product, related }) {
  const navigate = useNavigate();
  const { addItem, busy } = useCart();
  const [selection, setSelection] = useState(() => emptySelection(product));
  const theme = themeOf(product.category?.theme);
  const variant = selectedVariant(product, selection);
  const unitPrice = selectionPrice(product, selection);
  const options = {
    variantId: selection.variantId,
    colour: selection.colour,
    quantity: selection.quantity,
    customisation: { instructions: selection.instructions, message: selection.message },
  };

  const buyNow = async () => {
    if (await addItem(product, { ...options, silent: true })) navigate('/checkout');
  };

  const message = buildOrderMessage({
    items: [{ name: product.name, quantity: selection.quantity, colour: selection.colour, size: variant?.size, customisation: options.customisation }],
    total: unitPrice * selection.quantity,
  });

  return (
    <div className="container-page pb-6 pt-6 sm:pt-10">
      <nav className="mb-6 text-sm font-medium text-muted" aria-label="Breadcrumb">
        <Link to="/" className="hover:underline">
          Home
        </Link>{' '}
        /{' '}
        <Link to="/shop" className="hover:underline">
          Shop
        </Link>{' '}
        /{' '}
        <Link to={`/shop/${product.category?.slug}`} className="hover:underline">
          {product.category?.name}
        </Link>{' '}
        / <span className="text-olive">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        <div className="relative">
          <ProductGallery images={product.images} name={product.name} tile={theme.tile} />
          <WishlistButton product={product} className="absolute right-4 top-4 h-12 w-12" size={20} />
        </div>

        <div>
          <Link to={`/shop/${product.category?.slug}`} className="inline-block rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.14em]" style={{ background: theme.bg, color: theme.ink }}>
            {product.category?.name}
          </Link>
          <h1 className="mt-4 text-4xl sm:text-5xl">{product.name}</h1>
          {product.ratingCount > 0 && (
            <p className="mt-2 flex items-center gap-2 text-sm text-muted">
              <StarRating value={product.ratingAverage} /> {product.ratingCount} {product.ratingCount === 1 ? 'review' : 'reviews'}
            </p>
          )}
          <p className="mt-4 font-display text-3xl font-bold" aria-live="polite">
            {priceWithUnit(unitPrice, product.priceUnit)}
          </p>
          <div className="mt-3">
            {product.inStock ? (
              <Badge>
                <Check size={13} className="mr-1" /> Available · handmade to order
              </Badge>
            ) : (
              <Badge bg="#FBE9EC" ink="#6E1420">
                Currently unavailable
              </Badge>
            )}
          </div>
          <p className="mt-5 leading-relaxed text-olive/85">{product.description}</p>

          <div className="mt-7 border-t border-line pt-7">
            <CustomisationForm product={product} value={selection} onChange={setSelection} />
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button className="btn btn-primary" disabled={!product.inStock || busy} onClick={() => addItem(product, options)}>
              <ShoppingBag size={18} /> Add to cart
            </button>
            <button className="btn btn-outline" disabled={!product.inStock || busy} onClick={buyNow}>
              Buy now
            </button>
          </div>
          <a href={whatsappLink(message)} target="_blank" rel="noreferrer" className="btn btn-whatsapp mt-3 w-full">
            <WhatsAppIcon size={18} /> Order on WhatsApp instead
          </a>
          <p className="mt-2 text-center text-xs text-muted">Opens WhatsApp with your choices filled in. You review the message and press send.</p>
        </div>
      </div>

      <Reviews product={product} />

      {related?.length > 0 && (
        <section className="mt-16" aria-labelledby="related-title">
          <SectionHeading eyebrow={`More from ${product.category?.name}`} title={<span id="related-title">You may also like</span>} />
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}

export default function ProductDetails() {
  const { slug } = useParams();
  const { data, loading, error, reload } = useAsync(() => productApi.bySlug(slug), [slug]);

  useEffect(() => {
    if (data?.product) document.title = `${data.product.name} — Little Gifts Story`;
    return () => {
      document.title = 'Little Gifts Story — A little something, made by hand.';
    };
  }, [data]);

  if (loading) return <LoadingSpinner label="Loading product…" className="min-h-[50vh]" />;
  if (error) {
    return (
      <div className="container-page py-16">
        <ErrorMessage error={error.status === 404 ? { message: 'We could not find that product.' } : error} onRetry={error.status === 404 ? undefined : reload} />
        <div className="mt-6 text-center">
          <Link to="/shop" className="btn btn-primary">
            Back to shop
          </Link>
        </div>
      </div>
    );
  }
  return <Details key={data.product._id} product={data.product} related={data.related} />;
}
