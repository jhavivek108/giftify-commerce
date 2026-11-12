import mongoose from 'mongoose';
import { baseOptions } from '../utils/schemaOptions.js';

const newsletterSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  },
  baseOptions,
);

export const NewsletterSubscriber = mongoose.model('NewsletterSubscriber', newsletterSchema);
