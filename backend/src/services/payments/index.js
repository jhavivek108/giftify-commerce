/**
 * Payment service. Controllers and the order service only use this module,
 * so providers can be added or swapped without touching them.
 *
 * Provider interface:
 *   id            string
 *   label         string
 *   isEnabled()   boolean
 *   initiate(order)  -> { paymentStatus: 'pending', paymentReference: string, ...extra }
 *   verify(payload)  -> { verified: boolean, paymentReference?: string }
 *
 * Golden rule: no provider may ever return paymentStatus "paid" from
 * initiate(). Orders become paid only through an explicit admin action
 * (or, in future, a verified gateway callback).
 */
import { PAYMENT_METHODS } from '../../utils/constants.js';
import { ApiError } from '../../utils/ApiError.js';
import { codProvider } from './cod.js';
import { manualProvider } from './manual.js';
import { razorpayProvider } from './razorpay.js';

const providers = new Map([codProvider, manualProvider, razorpayProvider].map((provider) => [provider.id, provider]));

export function getProvider(method) {
  const provider = providers.get(method);
  if (!provider) throw ApiError.badRequest(`Unknown payment method: ${method}`);
  if (!provider.isEnabled()) throw new ApiError(501, `Payment method "${method}" is not configured`);
  return provider;
}

/** Methods a customer can choose at checkout today. */
export const availablePaymentMethods = () =>
  PAYMENT_METHODS.filter((method) => providers.get(method)?.isEnabled());

export const isRazorpayEnabled = () => razorpayProvider.isEnabled();

/** Starts the payment for a new order. Always yields a pending payment. */
export async function initiatePayment(method, order) {
  const result = await getProvider(method).initiate(order);
  return { ...result, paymentStatus: 'pending' };
}

export async function verifyPayment(method, payload) {
  return getProvider(method).verify(payload);
}
