import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { CartLine } from '../components/CartDrawer';
import { EmptyState, WhatsAppIcon } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatINR } from '../utils/format';
import { buildOrderMessage, cartItemsForMessage, whatsappLink } from '../utils/whatsapp';

export function deliveryFor(subtotal, config) {
  const charge = Number(config?.deliveryCharge) || 0;
  const freeAbove = Number(config?.freeDeliveryAbove) || 0;
  if (!charge) return 0;
  return freeAbove > 0 && subtotal >= freeAbove ? 0 : charge;
}

export function OrderTotals({ subtotal, config }) {
  const delivery = deliveryFor(subtotal, config);
  const hasCharge = Number(config?.deliveryCharge) > 0;
  return (
    <dl className="space-y-3">
      <div className="flex justify-between">
        <dt>Subtotal</dt>
        <dd className="font-bold">{formatINR(subtotal)}</dd>
      </div>
      <div className="flex justify-between">
        <dt>Delivery</dt>
        <dd className="font-bold">{hasCharge ? (delivery ? formatINR(delivery) : 'Free') : 'Confirmed with your order'}</dd>
      </div>
      <div className="flex justify-between border-t border-line pt-3 text-xl">
        <dt className="font-bold">Total</dt>
        <dd className="font-display font-bold">{formatINR(subtotal + delivery)}</dd>
      </div>
    </dl>
  );
}

export default function Cart() {
  const { items, purchasable, subtotal } = useCart();
  const { config, user } = useAuth();
  const blocked = items.some((i) => i.available === false);

  if (items.length === 0) {
    return (
      <div className="container-page py-16">
        <EmptyState
          title="Your cart is empty"
          action={
            <Link to="/shop" className="btn btn-primary">
              Continue shopping
            </Link>
          }
        >
          Find a little something made by hand.
        </EmptyState>
      </div>
    );
  }

  const message = buildOrderMessage({
    customerName: user?.name,
    items: cartItemsForMessage(purchasable),
    total: subtotal + deliveryFor(subtotal, config),
  });

  return (
    <div className="container-page pb-6 pt-10 sm:pt-14">
      <h1 className="text-5xl">Shopping cart</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <ul className="space-y-4">
            {items.map((item) => (
              <CartLine key={item._id} item={item} />
            ))}
          </ul>
          <Link to="/shop" className="mt-6 inline-flex items-center gap-2 font-bold hover:underline">
            <ArrowLeft size={17} /> Continue shopping
          </Link>
        </div>

        <aside className="surface h-fit p-6 sm:p-8 lg:sticky lg:top-24" aria-label="Order summary">
          <h2 className="mb-5 text-2xl">Order summary</h2>
          <OrderTotals subtotal={subtotal} config={config} />
          {blocked && <p className="mt-4 text-sm font-bold text-rose">Remove unavailable items before checking out.</p>}
          <Link to="/checkout" aria-disabled={blocked || purchasable.length === 0} className={`btn btn-primary mt-6 w-full ${blocked || purchasable.length === 0 ? 'pointer-events-none opacity-50' : ''}`}>
            Proceed to checkout <ArrowRight size={17} />
          </Link>
          <a href={whatsappLink(message)} target="_blank" rel="noreferrer" className="btn btn-whatsapp mt-3 w-full">
            <WhatsAppIcon size={18} /> Order on WhatsApp
          </a>
          <p className="mt-3 text-center text-xs text-muted">WhatsApp opens with your cart written out. Nothing is sent until you press send.</p>
        </aside>
      </div>
    </div>
  );
}
