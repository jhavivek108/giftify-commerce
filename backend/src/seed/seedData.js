/**
 * Seeding logic shared by `npm run seed`, `npm run dev:demo` and the smoke test.
 * The data itself lives in ./catalogue.js (the single source of truth).
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { z } from 'zod';
import { env } from '../config/env.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { categories, products } from './catalogue.js';

export const DEFAULT_STOCK = 20;
export const BCRYPT_COST = 12;

/**
 * Inserts catalogue categories and products that are not in the database yet.
 * Matching is by slug and uses $setOnInsert, so re-running never overwrites
 * anything an admin has edited. With reset = true, all categories and
 * products are deleted first.
 */
export async function seedCatalogue({ reset = false } = {}) {
  if (reset) {
    await Promise.all([Product.deleteMany({}), Category.deleteMany({})]);
  }

  const startedAt = Date.now();
  let categoriesAdded = 0;
  let productsAdded = 0;

  for (const category of categories) {
    const now = new Date();
    const result = await Category.updateOne(
      { slug: category.slug },
      { $setOnInsert: { ...category, isActive: true, createdAt: now, updatedAt: now } },
      { upsert: true, timestamps: false },
    );
    categoriesAdded += result.upsertedCount;
  }

  const categoryIdBySlug = new Map((await Category.find().select('slug')).map((doc) => [doc.slug, doc._id]));

  for (const [index, product] of products.entries()) {
    const { categorySlug, variants, ...fields } = product;
    const categoryId = categoryIdBySlug.get(categorySlug);
    if (!categoryId) throw new Error(`Catalogue product "${product.slug}" refers to unknown category "${categorySlug}"`);

    // Staggered timestamps keep catalogue order stable when sorting by "newest".
    const timestamp = new Date(startedAt + index);
    const result = await Product.updateOne(
      { slug: product.slug },
      {
        $setOnInsert: {
          ...fields,
          category: categoryId,
          variants: variants.map((variant) => ({
            _id: new mongoose.Types.ObjectId(),
            ...variant,
            stock: DEFAULT_STOCK,
            isAvailable: true,
          })),
          stock: variants.length > 0 ? 0 : DEFAULT_STOCK,
          isAvailable: true,
          ratingAverage: 0,
          ratingCount: 0,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
      { upsert: true, timestamps: false },
    );
    productsAdded += result.upsertedCount;
  }

  return {
    categoriesAdded,
    productsAdded,
    categoriesTotal: await Category.countDocuments(),
    productsTotal: await Product.countDocuments(),
  };
}

const adminSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
});

/**
 * Creates the admin account from ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD.
 * An existing account with that email is left completely untouched.
 * The password is hashed and never logged.
 *
 * Returns { status, email? } where status is one of:
 *   'not_configured' | 'invalid' | 'created' | 'exists' | 'exists_not_admin'
 */
export async function ensureAdmin() {
  const { name, email, password } = env.admin;
  if (!email || !password) return { status: 'not_configured' };

  const parsed = adminSchema.safeParse({ email, password });
  if (!parsed.success) return { status: 'invalid' };

  const existing = await User.findOne({ email: parsed.data.email });
  if (existing) {
    return { status: existing.role === 'admin' ? 'exists' : 'exists_not_admin', email: existing.email };
  }

  await User.create({
    name: name || 'Admin',
    email: parsed.data.email,
    passwordHash: await bcrypt.hash(parsed.data.password, BCRYPT_COST),
    role: 'admin',
  });
  return { status: 'created', email: parsed.data.email };
}

/** Human-readable lines describing the result of ensureAdmin(). */
export function describeAdminResult(result) {
  switch (result.status) {
    case 'created':
      return [`Admin account created: ${result.email} (password as set in ADMIN_PASSWORD)`];
    case 'exists':
      return [`Admin account already exists: ${result.email} (left untouched)`];
    case 'exists_not_admin':
      return [
        `An account with ${result.email} already exists but is NOT an admin. It was left untouched.`,
        'Use a different ADMIN_EMAIL, or change that user\'s role to "admin" in the database.',
      ];
    case 'invalid':
      return [
        'Admin account NOT created: ADMIN_EMAIL must be a valid email address and',
        'ADMIN_PASSWORD must be 8 to 72 characters long. Fix them in backend/.env and run the seed again.',
      ];
    default:
      return [
        'No admin account was created. To create one, set these in backend/.env',
        'and run "npm run seed" again:',
        '  ADMIN_NAME=<your name>',
        '  ADMIN_EMAIL=<your email>',
        '  ADMIN_PASSWORD=<at least 8 characters>',
      ];
  }
}
