import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingBag, Trash2, X } from 'lucide-react';
import { QuantityStepper } from './ui';
import { useCart } from '../context/CartContext';
import { formatINR, productImage } from '../utils/format';

export function CartLine({ item, compact = false }) {
  const { updateQuantity, removeItem, busy } = useCart();
  const unavailable = item.available === false;
  return (
    <li className={`flex gap-4 ${compact ? 'py-4' : 'rounded-[24px] bg-white p-4 sm:p-5'}`}>
      <Link to={`/product/${item.product.slug}`} className={`grid shrink-0 place-items-center rounded-2xl bg-cream p-2 ${compact ? 'h-20 w-20' : 'h-24 w-24 sm:h-28 sm:w-28'}`}>
        <img src={productImage(item.product)} alt={item.product.name} className="max-h-full max-w-full object-contain" loading="lazy" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link to={`/product/${item.product.slug}`} className="font-display text-lg font-bold leading-tight hover:underline">
              {item.product.name}
            </Link>
            <p className="mt-0.5 text-sm text-muted">
              {[item.size && `Size: ${item.size}`, item.colour && `Colour: ${item.colour}`, item.product.priceUnit].filter(Boolean).join(' · ')}
            </p>
          </div>
          <button onClick={() => removeItem(item._id)} disabled={busy} aria-label={`Remove ${item.product.name}`} className="rounded-full p-2 text-muted hover:bg-cream hover:text-rose">
            <Trash2 size={16} />
          </button>
        </div>
        {!compact && item.customisation?.instructions && <p className="mt-1 text-sm text-muted">Customisation: {item.customisation.instructions}</p>}
        {!compact && item.customisation?.message && <p className="mt-1 text-sm text-muted">Message: “{item.customisation.message}”</p>}
        {unavailable ? (
          <p className="mt-2 text-sm font-bold text-rose">No longer available — please remove it to continue.</p>
        ) : (
          <div className="mt-3 flex items-center justify-between gap-3">
            <QuantityStepper size="sm" value={item.quantity} max={item.maxQuantity || 20} disabled={busy} onChange={(q) => updateQuantity(item._id, q)} />
            <span className="font-bold">{formatINR(item.lineTotal)}</span>
          </div>
        )}
      </div>
    </li>
  );
}

export default function CartDrawer() {
  const { drawerOpen, closeDrawer, items, subtotal, itemCount } = useCart();

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && closeDrawer();
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [drawerOpen, closeDrawer]);

  return (
    <AnimatePresence>
      {drawerOpen && (
        <motion.div className="fixed inset-0 z-[60] bg-olive/40 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && closeDrawer()}>
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-cream shadow-lift"
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <h2 className="text-2xl">
                Your cart <span className="font-sans text-base font-medium text-muted">({itemCount})</span>
              </h2>
              <button onClick={closeDrawer} aria-label="Close cart" className="grid h-10 w-10 place-items-center rounded-full bg-white hover:bg-line">
                <X size={18} />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-white">
                  <ShoppingBag size={26} />
                </span>
                <p className="font-display text-2xl font-bold">Your cart is empty</p>
                <p className="text-muted">Find a little something made by hand.</p>
                <Link to="/shop" onClick={closeDrawer} className="btn btn-primary">
                  Explore collection
                </Link>
              </div>
            ) : (
              <>
                <ul className="flex-1 divide-y divide-line overflow-y-auto px-6">
                  {items.map((item) => (
                    <CartLine key={item._id} item={item} compact />
                  ))}
                </ul>
                <div className="border-t border-line bg-white px-6 py-5">
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>Subtotal</span>
                    <span>{formatINR(subtotal)}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">Delivery is confirmed at checkout.</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Link to="/cart" onClick={closeDrawer} className="btn btn-outline">
                      View cart
                    </Link>
                    <Link to="/checkout" onClick={closeDrawer} className="btn btn-primary">
                      Checkout
                    </Link>
                  </div>
                </div>
              </>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
