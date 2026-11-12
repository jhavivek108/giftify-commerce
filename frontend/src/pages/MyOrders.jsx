import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import OrderSummary, { StatusBadge } from '../components/OrderSummary';
import { EmptyState, ErrorMessage, LoadingSpinner } from '../components/ui';
import useAsync from '../hooks/useAsync';
import { orderApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { capitalise, formatDate, formatDateTime, formatINR } from '../utils/format';

function OrderCard({ order, onChanged }) {
  const [open, setOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { success, error } = useToast();

  const cancel = async () => {
    if (!window.confirm(`Cancel order ${order.orderNumber}?`)) return;
    setCancelling(true);
    try {
      await orderApi.cancel(order._id);
      success('Your order has been cancelled.');
      onChanged();
    } catch (e) {
      error(e.message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <li className="surface overflow-hidden">
      <button className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 p-6 text-left" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="min-w-40 flex-1">
          <span className="block font-display text-xl font-bold">{order.orderNumber}</span>
          <span className="text-sm text-muted">
            {formatDate(order.createdAt)} · {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
          </span>
        </span>
        <StatusBadge status={order.status} />
        <span className="font-bold">{formatINR(order.total)}</span>
        <ChevronDown size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-line p-6">
          <OrderSummary order={order} />
          {order.statusHistory?.length > 0 && (
            <div className="mt-5 border-t border-line pt-5">
              <p className="eyebrow mb-3 text-muted">Order history</p>
              <ol className="space-y-2 text-sm">
                {order.statusHistory.map((h, i) => (
                  <li key={i} className="flex flex-wrap gap-x-3">
                    <span className="font-bold">{capitalise(h.status)}</span>
                    <span className="text-muted">{formatDateTime(h.at)}</span>
                    {h.note && <span>{h.note}</span>}
                  </li>
                ))}
              </ol>
            </div>
          )}
          {order.status === 'placed' && (
            <button className="btn btn-outline btn-sm mt-5" onClick={cancel} disabled={cancelling}>
              {cancelling ? 'Cancelling…' : 'Cancel order'}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export default function MyOrders() {
  const { data, loading, error, reload } = useAsync(() => orderApi.mine(), []);
  const orders = data?.items || [];

  return (
    <div className="container-page pb-6 pt-10 sm:pt-14">
      <h1 className="text-5xl">My orders</h1>
      <div className="mt-8">
        {loading ? (
          <LoadingSpinner label="Loading your orders…" />
        ) : error ? (
          <ErrorMessage error={error} onRetry={reload} />
        ) : orders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            action={
              <Link to="/shop" className="btn btn-primary">
                Explore collection
              </Link>
            }
          >
            When you place an order while signed in, it will appear here.
          </EmptyState>
        ) : (
          <ul className="mx-auto max-w-4xl space-y-4">
            {orders.map((order) => (
              <OrderCard key={order._id} order={order} onChanged={reload} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
