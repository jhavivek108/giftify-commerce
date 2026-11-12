import mongoose from 'mongoose';
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from '../utils/constants.js';
import { money } from '../utils/money.js';
import { baseOptions, subOptions, valueOptions } from '../utils/schemaOptions.js';
import { customisationSchema } from './Cart.js';

const { ObjectId } = mongoose.Schema.Types;

// Everything about a line is a SNAPSHOT taken when the order was placed, so
// later product edits (or deletion) never change what the customer bought.
const orderItemSchema = new mongoose.Schema(
  {
    product: { type: ObjectId, ref: 'Product' }, // kept even if the product is deleted later
    variantId: { type: ObjectId, default: null }, // needed to put stock back on cancellation
    name: { type: String, required: true },
    slug: { type: String, default: '' },
    image: { type: String, default: '' },
    categoryName: { type: String, default: '' },
    size: { type: String, default: null },
    colour: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: money({ required: true }),
    lineTotal: money({ required: true }),
    priceUnit: { type: String, default: '' },
    customisation: { type: customisationSchema, default: () => ({}) },
  },
  subOptions,
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    note: { type: String, trim: true, default: '', maxlength: 500 },
    at: { type: Date, default: Date.now },
    by: { type: ObjectId, ref: 'User', default: null },
  },
  valueOptions,
);

// Audit trail of manual payment updates made by admins.
const paymentHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: PAYMENT_STATUSES, required: true },
    reference: { type: String, trim: true, default: '' },
    note: { type: String, trim: true, default: '', maxlength: 500 },
    at: { type: Date, default: Date.now },
    by: { type: ObjectId, ref: 'User', default: null },
  },
  valueOptions,
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: ObjectId, ref: 'User', default: null }, // null = guest checkout
    customer: {
      type: new mongoose.Schema(
        {
          fullName: { type: String, required: true, trim: true },
          email: { type: String, required: true, trim: true, lowercase: true },
          phone: { type: String, required: true, trim: true },
        },
        valueOptions,
      ),
      required: true,
    },
    shippingAddress: {
      type: new mongoose.Schema(
        {
          address: { type: String, required: true, trim: true },
          city: { type: String, required: true, trim: true },
          state: { type: String, required: true, trim: true },
          pinCode: { type: String, required: true, trim: true },
        },
        valueOptions,
      ),
      required: true,
    },
    deliveryInstructions: { type: String, trim: true, default: '', maxlength: 500 },
    orderNotes: { type: String, trim: true, default: '', maxlength: 1000 },
    items: {
      type: [orderItemSchema],
      validate: { validator: (items) => items.length > 0, message: 'An order needs at least one item' },
    },
    subtotal: money({ required: true }),
    deliveryCharge: money({ required: true }),
    total: money({ required: true }),
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    // Never set to "paid" automatically: only an admin can do that.
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'pending' },
    paymentReference: { type: String, trim: true, default: '' },
    paidAt: { type: Date, default: null },
    paymentHistory: { type: [paymentHistorySchema], default: [] },
    status: { type: String, enum: ORDER_STATUSES, default: 'placed' },
    statusHistory: { type: [statusHistorySchema], default: [] },
  },
  baseOptions,
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

export const Order = mongoose.model('Order', orderSchema);
