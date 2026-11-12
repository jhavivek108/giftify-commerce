import { z } from 'zod';
import { MAX_ORDER_LINES, ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from '../utils/constants.js';
import { email, indianPhone, limitQuery, lineItem, optionalField, pageQuery, pinCode, searchQuery } from './common.js';

// Prices, totals, status and payment status are deliberately NOT accepted
// from the client: unknown keys are stripped and the server computes them.
export const createOrderBody = z.object({
  customer: z.object({
    fullName: z.string().trim().min(2, 'Enter your full name').max(80),
    email,
    phone: indianPhone,
  }),
  shippingAddress: z.object({
    address: z.string().trim().min(5, 'Enter your full address').max(300),
    city: z.string().trim().min(2, 'Enter your city').max(60),
    state: z.string().trim().min(2, 'Enter your state').max(60),
    pinCode,
  }),
  deliveryInstructions: optionalField(z.string().trim().max(500)),
  orderNotes: optionalField(z.string().trim().max(1000)),
  paymentMethod: z.enum(PAYMENT_METHODS, { error: `Payment method must be one of: ${PAYMENT_METHODS.join(', ')}` }),
  items: z
    .array(lineItem)
    .min(1, 'Your order has no items')
    .max(MAX_ORDER_LINES, `An order can have at most ${MAX_ORDER_LINES} lines`),
});

export const adminOrderListQuery = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  search: searchQuery,
  page: pageQuery,
  limit: limitQuery(20),
});

export const updateOrderStatusBody = z.object({
  status: z.enum(ORDER_STATUSES, { error: `Status must be one of: ${ORDER_STATUSES.join(', ')}` }),
  note: optionalField(z.string().trim().max(500)),
});

export const updateOrderPaymentBody = z.object({
  paymentStatus: z.enum(PAYMENT_STATUSES, { error: `Payment status must be one of: ${PAYMENT_STATUSES.join(', ')}` }),
  reference: optionalField(z.string().trim().max(120)),
  note: optionalField(z.string().trim().max(500)),
});
