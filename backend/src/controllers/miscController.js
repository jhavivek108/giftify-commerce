import { env } from '../config/env.js';
import { ContactMessage } from '../models/ContactMessage.js';
import { NewsletterSubscriber } from '../models/Newsletter.js';
import { availablePaymentMethods, isRazorpayEnabled } from '../services/payments/index.js';
import { created, ok } from '../utils/response.js';

export function health(req, res) {
  ok(res, { status: 'ok' });
}

/** Public, non-secret settings the storefront needs. */
export function getConfig(req, res) {
  ok(res, {
    whatsappNumber: env.whatsappNumber,
    deliveryCharge: env.deliveryCharge,
    freeDeliveryAbove: env.freeDeliveryAbove,
    paymentMethods: availablePaymentMethods(),
    razorpayEnabled: isRazorpayEnabled(),
  });
}

export async function subscribeNewsletter(req, res) {
  const { email } = req.valid.body;
  // Upsert so that two simultaneous sign-ups cannot raise a duplicate error.
  const result = await NewsletterSubscriber.updateOne({ email }, { $setOnInsert: { email } }, { upsert: true });

  if (result.upsertedCount === 0) {
    return ok(res, { email, alreadySubscribed: true }, 'You are already subscribed. Thank you!');
  }
  return created(res, { email, alreadySubscribed: false }, 'Thank you for subscribing!');
}

export async function submitContact(req, res) {
  const message = await ContactMessage.create(req.valid.body);
  created(res, { _id: message._id }, 'Thank you! We have received your message and will get back to you soon.');
}
