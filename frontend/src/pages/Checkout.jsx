import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Banknote, MessageCircle } from 'lucide-react';
import { OrderTotals } from './Cart';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { orderApi } from '../services/api';
import { fieldErrors, formatINR, productImage } from '../utils/format';

const PAYMENT_OPTIONS = {
  cod: { label: 'Cash on Delivery', hint: 'Pay in cash when your order arrives.', Icon: Banknote },
  manual: {
    label: 'Pay online (UPI / bank transfer)',
    hint: 'We share payment details on WhatsApp. Your order stays unpaid until we have confirmed your payment.',
    Icon: MessageCircle,
  },
};

const validate = (form) => {
  const errors = {};
  if (form.fullName.trim().length < 2) errors['customer.fullName'] = 'Please enter your full name.';
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors['customer.email'] = 'Please enter a valid email address.';
  if (!/^(\+?91)?[6-9]\d{9}$/.test(form.phone.replace(/[\s-]/g, ''))) errors['customer.phone'] = 'Please enter a 10-digit mobile number.';
  if (form.address.trim().length < 5) errors['shippingAddress.address'] = 'Please enter your address.';
  if (!form.city.trim()) errors['shippingAddress.city'] = 'Please enter your city.';
  if (!form.state.trim()) errors['shippingAddress.state'] = 'Please enter your state.';
  if (!/^\d{6}$/.test(form.pinCode.trim())) errors['shippingAddress.pinCode'] = 'PIN code must be 6 digits.';
  return errors;
};

function Field({ id, label, error, optional, className = '', as = 'input', ...props }) {
  const Tag = as;
  return (
    <div className={className}>
      <label className="label" htmlFor={id}>
        {label} {optional && <span className="font-medium text-muted">(optional)</span>}
      </label>
      <Tag id={id} className={`input ${as === 'textarea' ? 'min-h-20' : ''}`} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...props} />
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

export default function Checkout() {
  const navigate = useNavigate();
  const { user, config } = useAuth();
  const { purchasable, subtotal, orderItems, clearCart, items } = useCart();
  const [form, setForm] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: '',
    city: '',
    state: '',
    pinCode: '',
    deliveryInstructions: '',
    orderNotes: '',
    paymentMethod: 'cod',
  });
  const [errors, setErrors] = useState({});
  const [state, setState] = useState({ saving: false, error: null, placed: false });

  if (!state.placed && purchasable.length === 0) return <Navigate to="/cart" replace />;

  const bind = (name) => ({
    name,
    value: form[name],
    onChange: (e) => setForm((f) => ({ ...f, [name]: e.target.value })),
  });

  const submit = async (e) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById('checkout-form')?.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    setState({ saving: true, error: null, placed: false });
    try {
      const { order } = await orderApi.create({
        customer: { fullName: form.fullName.trim(), email: form.email.trim(), phone: form.phone.replace(/[\s-]/g, '') },
        shippingAddress: { address: form.address.trim(), city: form.city.trim(), state: form.state.trim(), pinCode: form.pinCode.trim() },
        deliveryInstructions: form.deliveryInstructions.trim() || undefined,
        orderNotes: form.orderNotes.trim() || undefined,
        paymentMethod: form.paymentMethod,
        items: orderItems,
      });
      setState({ saving: false, error: null, placed: true });
      sessionStorage.setItem('lgs_last_order', JSON.stringify(order));
      await clearCart();
      navigate(`/order-success/${order.orderNumber}`, { replace: true, state: { order } });
    } catch (error) {
      setErrors(fieldErrors(error));
      setState({ saving: false, error, placed: false });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const methods = (config.paymentMethods || ['cod', 'manual']).filter((m) => PAYMENT_OPTIONS[m]);
  const blocked = items.some((i) => i.available === false);

  return (
    <div className="container-page pb-6 pt-10 sm:pt-14">
      <h1 className="text-5xl">Checkout</h1>
      {!user && (
        <p className="mt-3 text-muted">
          Checking out as a guest.{' '}
          <Link to="/login" state={{ from: '/checkout' }} className="font-bold text-olive underline">
            Sign in
          </Link>{' '}
          to track this order under My Orders.
        </p>
      )}
      {state.error && (
        <div className="mt-6 rounded-3xl bg-[#FBE9EC] px-6 py-4 font-medium text-[#6E1420]" role="alert">
          {state.error.message}
        </div>
      )}

      <form id="checkout-form" onSubmit={submit} noValidate className="mt-8 grid gap-8 lg:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <fieldset className="surface p-6 sm:p-8">
            <legend className="float-left mb-5 w-full font-display text-2xl font-bold">Your details</legend>
            <div className="clear-both grid gap-4 sm:grid-cols-2">
              <Field id="fullName" label="Full name" autoComplete="name" required error={errors['customer.fullName']} {...bind('fullName')} className="sm:col-span-2" />
              <Field id="email" label="Email" type="email" autoComplete="email" required error={errors['customer.email']} {...bind('email')} />
              <Field id="phone" label="Phone number" type="tel" inputMode="tel" autoComplete="tel" required error={errors['customer.phone']} {...bind('phone')} />
            </div>
          </fieldset>

          <fieldset className="surface p-6 sm:p-8">
            <legend className="float-left mb-5 w-full font-display text-2xl font-bold">Delivery address</legend>
            <div className="clear-both grid gap-4 sm:grid-cols-3">
              <Field id="address" label="Address" as="textarea" autoComplete="street-address" required error={errors['shippingAddress.address']} {...bind('address')} className="sm:col-span-3" />
              <Field id="city" label="City" autoComplete="address-level2" required error={errors['shippingAddress.city']} {...bind('city')} />
              <Field id="state" label="State" autoComplete="address-level1" required error={errors['shippingAddress.state']} {...bind('state')} />
              <Field id="pinCode" label="PIN code" inputMode="numeric" maxLength={6} autoComplete="postal-code" required error={errors['shippingAddress.pinCode']} {...bind('pinCode')} />
              <Field id="deliveryInstructions" label="Delivery instructions" optional as="textarea" maxLength={500} {...bind('deliveryInstructions')} className="sm:col-span-3" placeholder="Landmark, preferred time, who to hand it to…" />
              <Field id="orderNotes" label="Order notes" optional as="textarea" maxLength={500} {...bind('orderNotes')} className="sm:col-span-3" placeholder="Anything else we should know about this order." />
            </div>
          </fieldset>

          <fieldset className="surface p-6 sm:p-8">
            <legend className="float-left mb-5 w-full font-display text-2xl font-bold">Payment</legend>
            <div className="clear-both space-y-3">
              {methods.map((method) => {
                const { label, hint, Icon } = PAYMENT_OPTIONS[method];
                const active = form.paymentMethod === method;
                return (
                  <label key={method} className={`flex cursor-pointer items-start gap-4 rounded-3xl border-[1.5px] p-5 transition-colors ${active ? 'border-olive bg-cream' : 'border-line'}`}>
                    <input type="radio" name="paymentMethod" value={method} checked={active} onChange={() => setForm((f) => ({ ...f, paymentMethod: method }))} className="mt-1 h-5 w-5 accent-[#333D25]" />
                    <span className="flex-1">
                      <span className="flex items-center gap-2 font-bold">
                        <Icon size={18} /> {label}
                      </span>
                      <span className="mt-1 block text-sm text-muted">{hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>

        <aside className="surface h-fit p-6 sm:p-8 lg:sticky lg:top-24" aria-label="Order summary">
          <h2 className="mb-5 text-2xl">Your order</h2>
          <ul className="mb-5 divide-y divide-line">
            {purchasable.map((item) => (
              <li key={item._id} className="flex gap-4 py-3">
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-cream p-1.5">
                  <img src={productImage(item.product)} alt="" className="max-h-full max-w-full object-contain" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold leading-tight">{item.product.name}</span>
                  <span className="block text-sm text-muted">
                    {[item.size, item.colour, `Qty ${item.quantity}`].filter(Boolean).join(' · ')}
                    {' · '}
                    {formatINR(item.unitPrice)}
                  </span>
                  {item.customisation?.instructions && <span className="block text-sm text-muted">Customisation: {item.customisation.instructions}</span>}
                  {item.customisation?.message && <span className="block text-sm text-muted">Message: “{item.customisation.message}”</span>}
                </span>
                <span className="font-bold">{formatINR(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <OrderTotals subtotal={subtotal} config={config} />
          <button type="submit" className="btn btn-primary mt-6 w-full" disabled={state.saving || blocked}>
            {state.saving ? 'Placing your order…' : 'Place order'}
          </button>
          <p className="mt-3 text-center text-xs text-muted">
            By placing your order you agree to our{' '}
            <Link to="/terms-and-conditions" className="underline">
              Terms
            </Link>{' '}
            and{' '}
            <Link to="/privacy-policy" className="underline">
              Privacy Policy
            </Link>
            .
          </p>
        </aside>
      </form>
    </div>
  );
}
