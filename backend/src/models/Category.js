import mongoose from 'mongoose';
import { CATEGORY_THEMES } from '../utils/constants.js';
import { baseOptions } from '../utils/schemaOptions.js';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true, default: '', maxlength: 500 },
    image: { type: String, trim: true, default: '' },
    theme: { type: String, enum: CATEGORY_THEMES, default: 'pink' },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  baseOptions,
);

export const Category = mongoose.model('Category', categorySchema);
