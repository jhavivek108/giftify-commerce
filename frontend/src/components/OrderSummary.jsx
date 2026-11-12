import { Badge } from './ui';
import { capitalise, formatDateTime, formatINR, imageUrl } from '../utils/format';
import { STATUS_STYLES } from '../utils/themes';

export const PAYMENT_METHOD_LABEL = { cod: 'Cash on Delivery', manual: 'Online payment (confirmed manually)' };

export function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.placed;
  return (
    <Badge bg={s.bg} ink={s.ink}>
      {capitalise(status)}
    </Badge>
  );
}

/** Read-only view of an order, shared by the customer pages and the admin dashboard. */
export default function OrderSummary({ order, showCustomer = true }) {
  return (
    <div className="space-y-6">
      <ul className="divide-y divide-line">
        {order.items.map((item, i) => (
          <li key={item._id || i} className="flex gap-4 py-3">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-cream p-1.5">
              <img src={imageUrl(item.image)} alt="" className="max-h-full max-w-full object-contain" loading="lazy" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold leading-tight">{item.name}</span>
              <span className="block text-sm text-muted">
                {[item.categoryName, item.size && `Size: ${item.size}`, item.colour && `Colour: ${item.colour}`].filter(Boolean).join(' · ')}
              </span>
              <span className="block text-sm text-muted">
                {item.quantity} × {formatINR(item.unitPrice)}
                {item.priceUnit ? ` (${item.priceUnit})` : ''}
              </span>
              {item.customisation?.instructions && <span className="mt-1 block text-sm">Customisation: {item.customisation.instructions}</span>}
              {item.customisation?.message && <span className="block text-sm">Message: “{item.customisation.message}”</span>}
            </span>
            <span className="font-bold">{formatINR(item.lineTotal)}</span>
          </li>
        ))}
      </ul>

      <dl className="space-y-2 border-t border-line pt-4">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd className="font-bold">{formatINR(order.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Delivery</dt>
          <dd className="font-bold">{order.deliveryCharge ? formatINR(order.deliveryCharge) : 'Confirmed with your order'}</dd>
        </div>
        <div className="flex justify-between text-xl">
          <dt className="font-bold">Total</dt>
          <dd className="font-display font-bold">{formatINR(order.total)}</dd>
        </div>
      </dl>

      <div className="grid gap-5 border-t border-line pt-5 text-sm sm:grid-cols-2">
        {showCustomer && (
          <div>
            <p className="eyebrow mb-2 text-muted">Deliver to</p>
            <p className="font-bold">{order.customer?.fullName}</p>
            <p>{order.shippingAddress?.address}</p>
            <p>
              {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.pinCode}
            </p>
            <p className="mt-1">
              {order.customer?.phone} · {order.customer?.email}
            </p>
            {order.deliveryInstructions && <p className="mt-2">Delivery instructions: {order.deliveryInstructions}</p>}
            {order.orderNotes && <p className="mt-1">Order notes: {order.orderNotes}</p>}
          </div>
        )}
        <div>
          <p className="eyebrow mb-2 text-muted">Payment</p>
          <p className="font-bold">{PAYMENT_METHOD_LABEL[order.paymentMethod] || order.paymentMethod}</p>
          <p className="mt-1 flex items-center gap-2">
            Status: <StatusBadge status={order.paymentStatus} />
          </p>
          {order.paidAt && <p className="mt-1">Confirmed {formatDateTime(order.paidAt)}</p>}
          <p className="mt-3 text-muted">Placed {formatDateTime(order.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}
