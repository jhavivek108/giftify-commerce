import { Link } from 'react-router-dom';
import ProductGrid from '../components/ProductGrid';
import { EmptyState } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

export default function Wishlist() {
  const { items, toggle } = useWishlist();
  const { addItem } = useCart();
  const { user } = useAuth();

  // Products without size options can go straight to the cart; the rest need a size chosen first.
  const movable = items.filter((p) => p.inStock && !p.hasVariants);

  const moveAll = async () => {
    for (const product of movable) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await addItem(product, { colour: product.colours?.[0]?.name, silent: true });
      // eslint-disable-next-line no-await-in-loop
      if (ok) await toggle(product);
    }
  };

  return (
    <div className="container-page pb-6 pt-10 sm:pt-14">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-[#B8935A]">Saved for later</p>
          <h1 className="mt-3 text-5xl">Your wishlist</h1>
          {!user && items.length > 0 && (
            <p className="mt-3 text-muted">
              Saved on this device.{' '}
              <Link to="/login" state={{ from: '/wishlist' }} className="font-bold text-olive underline">
                Sign in
              </Link>{' '}
              to keep it across devices.
            </p>
          )}
        </div>
        {movable.length > 0 && (
          <button className="btn btn-primary" onClick={moveAll}>
            Move {movable.length} to cart
          </button>
        )}
      </header>

      {items.length === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          action={
            <Link to="/shop" className="btn btn-primary">
              Explore collection
            </Link>
          }
        >
          Tap the heart on any product to save it here.
        </EmptyState>
      ) : (
        <ProductGrid products={items} />
      )}
    </div>
  );
}
