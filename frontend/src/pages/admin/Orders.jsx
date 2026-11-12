import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import OrderSummary, { StatusBadge } from '../../components/OrderSummary';
import { ErrorMessage, LoadingSpinner, Modal } from '../../components/ui';
import useAsync from '../../hooks/useAsync';
import useDebounce from '../../hooks/useDebounce';
import { adminApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { capitalise, formatDate, formatDateTime, formatINR } from '../../utils/format';
import { ORDER_STATUSES } from '../../utils/themes';
import { PageHeader, Pager, Table, td } from './shared';

const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

function OrderManager({ orderId, onChanged }) {
  const { success, error: toastError } = useToast();
  const { data, loading, error, reload } = useAsync(() => adminApi.order(orderId), [orderId]);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [payment, setPayment] = useState('');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const order = data?.order;

  useEffect(() => {
    if (order) {
      setStatus(order.status);
      setPayment(order.paymentStatus);
      setReference(order.paymentReference || '');
      setNote('');
    }
  }, [order]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;

  const closed = ['delivered', 'cancelled'].includes(order.status);

  const act = async (fn, message) => {
    setSaving(true);
    try {
      await fn();
      success(message);
      reload();
      onChanged();
    } catch (e) {
      toastError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-3xl">{order.orderNumber}</h2>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <form
          className="rounded-3xl bg-white p-5"
          onSubmit={(e) => {
            e.preventDefault();
            act(() => adminApi.setOrderStatus(order._id, { status, note: note.trim() || undefined }), 'Order status updated');
          }}
        >
          <label className="label" htmlFor="order-status">
            Order status
          </label>
          <select id="order-status" className="input" value={status} disabled={closed} onChange={(e) => setStatus(e.target.value)}>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {capitalise(s)}
              </option>
            ))}
          </select>
          <label className="label mt-3" htmlFor="order-note">
            Note <span className="font-medium text-muted">(optional)</span>
          </label>
          <input id="order-note" className="input" value={note} disabled={closed} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="e.g. Courier tracking number" />
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn btn-primary btn-sm" disabled={saving || closed || status === order.status}>
              Update status
            </button>
            {!closed && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={saving}
                onClick={() => window.confirm('Cancel this order? Stock will be restored.') && act(() => adminApi.setOrderStatus(order._id, { status: 'cancelled', note: note.trim() || undefined }), 'Order cancelled')}
              >
                Cancel order
              </button>
            )}
          </div>
          {closed && <p className="mt-3 text-sm text-muted">This order is {order.status} and can no longer change status.</p>}
        </form>

        <form
          className="rounded-3xl bg-white p-5"
          onSubmit={(e) => {
            e.preventDefault();
            act(() => adminApi.setOrderPayment(order._id, { paymentStatus: payment, reference: reference.trim() || undefined }), 'Payment status updated');
          }}
        >
          <label className="label" htmlFor="payment-status">
            Payment status
          </label>
          <select id="payment-status" className="input" value={payment} onChange={(e) => setPayment(e.target.value)}>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {capitalise(s)}
              </option>
            ))}
          </select>
          <label className="label mt-3" htmlFor="payment-ref">
            Payment reference <span className="font-medium text-muted">(optional)</span>
          </label>
          <input id="payment-ref" className="input" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} placeholder="UPI / bank reference" />
          <button className="btn btn-primary btn-sm mt-4" disabled={saving || (payment === order.paymentStatus && reference === (order.paymentReference || ''))}>
            Update payment
          </button>
          <p className="mt-3 text-sm text-muted">Only mark an order as paid after you have checked that the money was received.</p>
        </form>
      </div>

      <div className="rounded-3xl bg-white p-5">
        <OrderSummary order={order} />
      </div>

      <div className="rounded-3xl bg-white p-5">
        <p className="eyebrow mb-3 text-muted">Order history</p>
        <ol className="space-y-2 text-sm">
          {(order.statusHistory || []).map((h, i) => (
            <li key={i} className="flex flex-wrap gap-x-3">
              <span className="font-bold">{capitalise(h.status)}</span>
              <span className="text-muted">{formatDateTime(h.at)}</span>
              {h.note && <span>{h.note}</span>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default function Orders() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') || '');
  const debounced = useDebounce(search.trim(), 350);
  const status = params.get('status') || '';
  const paymentStatus = params.get('paymentStatus') || '';
  const page = Number(params.get('page')) || 1;
  const [openId, setOpenId] = useState(null);

  const set = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  const { data, loading, error, reload } = useAsync(() => adminApi.orders({ status, paymentStatus, search: debounced, page, limit: 20 }), [status, paymentStatus, debounced, page]);
  const orders = data?.items || [];

  return (
    <>
      <PageHeader title="Orders">View orders, update their status and confirm payments.</PageHeader>

      <div className="mb-5 flex flex-wrap gap-3">
        <input className="input max-w-xs" type="search" placeholder="Order number, name or phone" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search orders" />
        <select className="input w-auto" value={status} onChange={(e) => set({ status: e.target.value })} aria-label="Filter by order status">
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {capitalise(s)}
            </option>
          ))}
        </select>
        <select className="input w-auto" value={paymentStatus} onChange={(e) => set({ paymentStatus: e.target.value })} aria-label="Filter by payment status">
          <option value="">All payments</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {capitalise(s)}
            </option>
          ))}
        </select>
      </div>

      {loading && !data ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorMessage error={error} onRetry={reload} />
      ) : (
        <>
          <Table head={['Order', 'Customer', 'Date', 'Items', 'Status', 'Payment', 'Total', '']} empty={orders.length === 0 ? 'No orders match.' : ''}>
            {orders.map((o) => (
              <tr key={o._id} className="hover:bg-cream/60">
                <td className={`${td} font-bold`}>{o.orderNumber}</td>
                <td className={td}>
                  {o.customer?.fullName}
                  <span className="block text-sm text-muted">{o.customer?.phone}</span>
                </td>
                <td className={td}>{formatDate(o.createdAt)}</td>
                <td className={td}>{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
                <td className={td}>
                  <StatusBadge status={o.status} />
                </td>
                <td className={td}>
                  <StatusBadge status={o.paymentStatus} />
                </td>
                <td className={`${td} font-bold`}>{formatINR(o.total)}</td>
                <td className={td}>
                  <button className="btn btn-outline btn-sm" onClick={() => setOpenId(o._id)}>
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </Table>
          <Pager page={data.page} pages={data.pages} onPage={(p) => set({ page: p > 1 ? String(p) : '' })} />
        </>
      )}

      <Modal open={Boolean(openId)} onClose={() => setOpenId(null)} title="" wide>
        {openId && <OrderManager key={openId} orderId={openId} onChanged={reload} />}
      </Modal>
    </>
  );
}
