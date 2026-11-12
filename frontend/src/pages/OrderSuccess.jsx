import { Link, useLocation, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import OrderSummary from '../components/OrderSummary';
import { EmptyState, WhatsAppIcon } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { buildOrderMessage, whatsappLink } from '../utils/whatsapp';

const readStored = (orderNumber) => {
  try {
    const order = JSON.parse(sessionStorage.getItem('lgs_last_order'));
    return order?.orderNumber === orderNumber ? order : null;
  } catch {
    return null;
  }
};

export default function OrderSuccess() {
  const { orderNumber } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const order = location.state?.order || readStored(orderNumber);

  if (!order) {
    return (
      <div className="container-page py-16">
        <EmptyState
          title="Order details are not available here"
          action={
            <Link to={user ? '/orders' : '/shop'} className="btn btn-primary">
              {user ? 'Go to my orders' : 'Back to shop'}
            </Link>
          }
        >
          If you placed an order, we have it safely. Message us on WhatsApp with order number {orderNumber} for an update.
        </EmptyState>
      </div>
    );
  }

  const message = buildOrderMessage({
    orderNumber: order.orderNumber,
    customerName: order.customer.fullName,
    items: order.items,
    total: order.total,
  });

  return (
    <div className="container-page pb-6 pt-10 sm:pt-14">
      <div className="mx-auto max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-[32px] bg-[#D2E5CF] px-7 py-10 text-center text-[#1E4A26] sm:px-12">
          <motion.span initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }} className="inline-block">
            <CheckCircle2 size={52} />
          </motion.span>
          <h1 className="mt-4 text-4xl sm:text-5xl">Thank you, {order.customer.fullName.split(' ')[0]}!</h1>
          <p className="mt-3 text-lg">
            Your order <strong>{order.orderNumber}</strong> has been placed.
          </p>
          <p className="mx-auto mt-2 max-w-md">
            {order.paymentMethod === 'manual'
              ? 'We will share payment details on WhatsApp. Your order is marked unpaid until we have confirmed your payment.'
              : 'You pay in cash when it arrives. We will confirm your order and delivery details with you.'}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href={whatsappLink(message)} target="_blank" rel="noreferrer" className="btn btn-whatsapp">
              <WhatsAppIcon size={18} /> Send order on WhatsApp
            </a>
            <Link to="/shop" className="btn btn-white">
              Continue shopping
            </Link>
          </div>
          <p className="mt-3 text-xs opacity-80">WhatsApp opens with your order written out. You review it and press send.</p>
        </motion.div>

        <div className="surface mt-6 p-6 sm:p-8">
          <h2 className="mb-2 text-2xl">Order summary</h2>
          <OrderSummary order={order} />
        </div>
      </div>
    </div>
  );
}
