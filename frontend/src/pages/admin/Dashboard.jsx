import { Link } from 'react-router-dom';
import { StatusBadge } from '../../components/OrderSummary';
import { ErrorMessage, LoadingSpinner } from '../../components/ui';
import useAsync from '../../hooks/useAsync';
import { adminApi } from '../../services/api';
import { capitalise, formatDate, formatINR } from '../../utils/format';
import { ORDER_STATUSES, STATUS_STYLES, THEMES } from '../../utils/themes';
import { PageHeader, Table, td } from './shared';

function Stat({ label, value, hint, theme }) {
  return (
    <div className="rounded-[28px] p-6" style={{ background: theme.bg, color: theme.ink }}>
      <p className="eyebrow opacity-75">{label}</p>
      <p className="mt-2 font-display text-4xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-sm opacity-80">{hint}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { data, loading, error, reload } = useAsync(() => adminApi.dashboard(), []);

  if (loading) return <LoadingSpinner label="Loading dashboard…" />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;

  const d = data;
  return (
    <>
      <PageHeader title="Overview">How the shop is doing right now.</PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label="Total revenue" value={formatINR(d.totalRevenue)} hint={`${formatINR(d.paidRevenue)} confirmed as paid`} theme={THEMES.pink} />
        <Stat label="Total orders" value={d.totalOrders} hint={`${d.cancelledOrders || 0} cancelled`} theme={THEMES.yellow} />
        <Stat label="Pending orders" value={d.pendingOrders} hint="Not yet delivered" theme={THEMES.lavender} />
        <Stat label="Completed orders" value={d.completedOrders} hint="Delivered" theme={THEMES.mint} />
        <Stat label="Total products" value={d.totalProducts} theme={THEMES.blue} />
        <Stat label="Total customers" value={d.totalCustomers} hint="Registered accounts" theme={THEMES.peach} />
      </div>

      <section className="mt-8" aria-labelledby="by-status">
        <h2 id="by-status" className="mb-3 text-2xl">
          Orders by status
        </h2>
        <div className="flex flex-wrap gap-3">
          {ORDER_STATUSES.map((status) => (
            <Link key={status} to={`/admin/orders?status=${status}`} className="rounded-2xl px-5 py-3 font-bold" style={{ background: STATUS_STYLES[status].bg, color: STATUS_STYLES[status].ink }}>
              {capitalise(status)} · {d.ordersByStatus?.[status] || 0}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="recent">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="recent" className="text-2xl">
            Recent orders
          </h2>
          <Link to="/admin/orders" className="text-sm font-bold underline">
            View all
          </Link>
        </div>
        <Table head={['Order', 'Customer', 'Date', 'Status', 'Payment', 'Total']} empty={d.recentOrders.length === 0 ? 'No orders yet.' : ''}>
          {d.recentOrders.map((o) => (
            <tr key={o._id}>
              <td className={`${td} font-bold`}>
                <Link to={`/admin/orders?search=${o.orderNumber}`} className="underline">
                  {o.orderNumber}
                </Link>
              </td>
              <td className={td}>{o.customer?.fullName}</td>
              <td className={td}>{formatDate(o.createdAt)}</td>
              <td className={td}>
                <StatusBadge status={o.status} />
              </td>
              <td className={td}>
                <StatusBadge status={o.paymentStatus} />
              </td>
              <td className={`${td} font-bold`}>{formatINR(o.total)}</td>
            </tr>
          ))}
        </Table>
      </section>
    </>
  );
}
