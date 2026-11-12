import mongoose from 'mongoose';
import { baseOptions } from '../utils/schemaOptions.js';

const wishlistSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  },
  baseOptions,
);

export const Wishlist = mongoose.model('Wishlist', wishlistSchema);
