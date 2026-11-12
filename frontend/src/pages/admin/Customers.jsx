import { useState } from 'react';
import { StatusBadge } from '../../components/OrderSummary';
import { ErrorMessage, LoadingSpinner, Modal } from '../../components/ui';
import useAsync from '../../hooks/useAsync';
import useDebounce from '../../hooks/useDebounce';
import { adminApi } from '../../services/api';
import { formatDate, formatINR } from '../../utils/format';
import { PageHeader, Pager, Table, td } from './shared';

function CustomerDetail({ id }) {
  const { data, loading, error, reload } = useAsync(() => adminApi.customer(id), [id]);
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;
  const { customer, orders } = data;
  return (
    <div>
      <h2 className="text-3xl">{customer.name}</h2>
      <p className="mt-1 text-muted">
        {customer.email}
        {customer.phone ? ` · ${customer.phone}` : ''} · Joined {formatDate(customer.createdAt)}
      </p>
      <h3 className="mb-3 mt-6 text-xl">Order history</h3>
      {orders.length === 0 ? (
        <p className="rounded-3xl bg-white px-5 py-6 text-muted">No orders yet.</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o._id} className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-3xl bg-white px-5 py-4">
              <span className="mr-auto">
                <span className="block font-bold">{o.orderNumber}</span>
                <span className="text-sm text-muted">
                  {formatDate(o.createdAt)} · {o.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')}
                </span>
              </span>
              <StatusBadge status={o.status} />
              <span className="font-bold">{formatINR(o.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Customers() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  const debounced = useDebounce(search.trim(), 350);
  const { data, loading, error, reload } = useAsync(() => adminApi.customers({ search: debounced, page }), [debounced, page]);
  const customers = data?.items || [];

  return (
    <>
      <PageHeader title="Customers">{data ? `${data.total} registered customers` : 'Registered customer accounts.'}</PageHeader>
      <input
        className="input mb-5 max-w-xs"
        type="search"
        placeholder="Search name, email or phone"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        aria-label="Search customers"
      />
      {loading && !data ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorMessage error={error} onRetry={reload} />
      ) : (
        <>
          <Table head={['Name', 'Email', 'Phone', 'Joined', 'Orders', 'Spent', '']} empty={customers.length === 0 ? 'No customers yet.' : ''}>
            {customers.map((c) => (
              <tr key={c._id} className="hover:bg-cream/60">
                <td className={`${td} font-bold`}>{c.name}</td>
                <td className={td}>{c.email}</td>
                <td className={td}>{c.phone || '—'}</td>
                <td className={td}>{formatDate(c.createdAt)}</td>
                <td className={td}>{c.orderCount}</td>
                <td className={`${td} font-bold`}>{formatINR(c.totalSpent)}</td>
                <td className={td}>
                  <button className="btn btn-outline btn-sm" onClick={() => setOpenId(c._id)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </Table>
          <Pager page={data.page} pages={data.pages} onPage={setPage} />
        </>
      )}
      <Modal open={Boolean(openId)} onClose={() => setOpenId(null)} title="" wide>
        {openId && <CustomerDetail key={openId} id={openId} />}
      </Modal>
    </>
  );
}
