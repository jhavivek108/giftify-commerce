import mongoose from 'mongoose';
import { money } from '../utils/money.js';
import { baseOptions, subOptions, valueOptions } from '../utils/schemaOptions.js';

const wholeNumber = { validator: Number.isInteger, message: 'Stock must be a whole number' };

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    alt: { type: String, trim: true, default: '' },
  },
  valueOptions,
);

const colourSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    hex: { type: String, trim: true, default: '' },
  },
  valueOptions,
);

// Variants keep their _id: carts and orders refer to a variant by it.
const variantSchema = new mongoose.Schema(
  {
    size: { type: String, required: true, trim: true },
    price: money({ required: true }),
    stock: { type: Number, default: 0, min: 0, validate: wholeNumber },
    isAvailable: { type: Boolean, default: true },
  },
  subOptions,
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true, default: '', maxlength: 4000 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    // For products with variants this always mirrors the lowest variant price.
    basePrice: money({ required: true }),
    priceUnit: { type: String, trim: true, default: 'each' },
    images: { type: [imageSchema], default: [] },
    colours: { type: [colourSchema], default: [] },
    variants: { type: [variantSchema], default: [] },
    customisable: { type: Boolean, default: false },
    // Used only when the product has no variants.
    stock: { type: Number, default: 0, min: 0, validate: wholeNumber },
    isAvailable: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
  },
  baseOptions,
);

productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ isFeatured: 1 });
productSchema.index({ basePrice: 1 });

productSchema.virtual('hasVariants').get(function hasVariants() {
  return Array.isArray(this.variants) && this.variants.length > 0;
});

productSchema.virtual('inStock').get(function inStock() {
  if (!this.isAvailable) return false;
  if (Array.isArray(this.variants) && this.variants.length > 0) {
    return this.variants.some((variant) => variant.isAvailable && variant.stock > 0);
  }
  return this.stock > 0;
});

// Keep basePrice in sync with the cheapest variant on every save.
productSchema.pre('validate', function syncBasePrice() {
  if (Array.isArray(this.variants) && this.variants.length > 0) {
    const prices = this.variants.map((variant) => variant.price).filter((price) => Number.isFinite(price));
    if (prices.length > 0) this.basePrice = Math.min(...prices);
  }
});

/**
 * MongoDB filter matching the `inStock` virtual (apart from isAvailable):
 * a non-variant product with stock, or any available variant with stock.
 */
export const IN_STOCK_FILTER = {
  $or: [
    { 'variants.0': { $exists: false }, stock: { $gt: 0 } },
    { variants: { $elemMatch: { isAvailable: true, stock: { $gt: 0 } } } },
  ],
};

export const Product = mongoose.model('Product', productSchema);
