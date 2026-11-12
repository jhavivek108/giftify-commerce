import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * Razorpay provider - STUB, NOT IMPLEMENTED YET.
 *
 * It is disabled unless both RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set,
 * and even then `initiate` and `verify` throw 501 until the TODOs below are
 * done. To finish the integration later:
 *   1. implement `initiate` and `verify`,
 *   2. add 'razorpay' to PAYMENT_METHODS in src/utils/constants.js,
 *   3. add a route that calls paymentService.verify() for the checkout callback / webhook.
 * No controller needs to change: they only talk to services/payments/index.js.
 */
const notConfigured = () =>
  new ApiError(501, 'Online payment (Razorpay) is not configured yet. Please choose another payment method.');

export const razorpayProvider = {
  id: 'razorpay',
  label: 'Pay online (Razorpay)',
  isEnabled: () => env.razorpay.enabled,

  // TODO(razorpay): create a Razorpay order (amount in paise = order.total * 100,
  // receipt = order.orderNumber) with the official SDK and return
  // { paymentStatus: 'pending', paymentReference: <razorpay_order_id>, checkout: { keyId, orderId, amount } }.
  // The order must still start as "pending".
  // eslint-disable-next-line no-unused-vars
  async initiate(order) {
    throw notConfigured();
  },

  // TODO(razorpay): verify the HMAC-SHA256 signature of
  // `${razorpay_order_id}|${razorpay_payment_id}` with RAZORPAY_KEY_SECRET
  // (use crypto.timingSafeEqual) and return { verified: true, paymentReference: razorpay_payment_id }.
  // eslint-disable-next-line no-unused-vars
  async verify(payload) {
    throw notConfigured();
  },
};
