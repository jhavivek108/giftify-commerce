import mongoose from 'mongoose';
import { MAX_LINE_QUANTITY } from '../utils/constants.js';
import { baseOptions, subOptions, valueOptions } from '../utils/schemaOptions.js';

export const customisationSchema = new mongoose.Schema(
  {
    instructions: { type: String, trim: true, default: '', maxlength: 500 },
    message: { type: String, trim: true, default: '', maxlength: 300 },
  },
  valueOptions,
);

const cartItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, default: null },
    colour: { type: String, trim: true, default: '', maxlength: 60 },
    quantity: { type: Number, required: true, min: 1, max: MAX_LINE_QUANTITY },
    customisation: { type: customisationSchema, default: () => ({}) },
  },
  subOptions,
);

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: { type: [cartItemSchema], default: [] },
  },
  baseOptions,
);

export const Cart = mongoose.model('Cart', cartSchema);
