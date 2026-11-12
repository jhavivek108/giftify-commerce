/**
 * npm run smoke
 *
 * End-to-end smoke test. Boots the real Express app on a random port against
 * a throw-away in-memory MongoDB replica set, seeds the catalogue and drives
 * the HTTP API with fetch. Exits non-zero if any check fails.
 * It never touches the database in backend/.env.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { startMemoryDb } from './lib/memoryDb.js';

// ---------------------------------------------------------------------------
// Environment: fully controlled by the test, nothing is read from backend/.env
// (variables that are already set win over the file).
// ---------------------------------------------------------------------------
const FRONTEND = 'http://localhost:5173';
const DELIVERY_CHARGE = 40;
const FREE_DELIVERY_ABOVE = 500;

console.log('Starting in-memory MongoDB replica set...');
const memoryDb = await startMemoryDb();

Object.assign(process.env, {
  NODE_ENV: 'test',
  PORT: '5000', // unused: the test listens on a random free port
  MONGODB_URI: memoryDb.uri,
  JWT_SECRET: crypto.randomBytes(48).toString('hex'),
  JWT_EXPIRES_IN: '1h',
  FRONTEND_URL: FRONTEND,
  WHATSAPP_NUMBER: '910000000000',
  IMAGE_STORAGE_PROVIDER: 'local',
  IMAGE_STORAGE_API_KEY: '',
  IMAGE_STORAGE_API_SECRET: '',
  RAZORPAY_KEY_ID: '',
  RAZORPAY_KEY_SECRET: '',
  DELIVERY_CHARGE: String(DELIVERY_CHARGE),
  FREE_DELIVERY_ABOVE: String(FREE_DELIVERY_ABOVE),
  ADMIN_NAME: '',
  ADMIN_EMAIL: '',
  ADMIN_PASSWORD: '',
  TRUST_PROXY: '',
});

const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { createApp } = await import('../src/app.js');
const { listen } = await import('../src/utils/httpServer.js');
const { seedCatalogue, ensureAdmin, BCRYPT_COST } = await import('../src/seed/seedData.js');
const { User, Product } = await import('../src/models/index.js');
const { UPLOADS_DIR } = await import('../src/services/storage/index.js');
const bcrypt = (await import('bcryptjs')).default;

await connectDB();
const seedResult = await seedCatalogue();
const server = await listen(createApp(), 0);
const BASE = `http://127.0.0.1:${server.address().port}`;
console.log(`API under test: ${BASE}\n`);

// ---------------------------------------------------------------------------
// Tiny test harness
// ---------------------------------------------------------------------------
let passed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ok    ${name}`);
  } catch (error) {
    failures.push({ name, error });
    console.log(`  FAIL  ${name}\n        ${String(error.message).split('\n').join('\n        ')}`);
  }
}

const section = (title) => console.log(`\n${title}`);

/** One API consumer with its own cookie jar (like one browser). */
class Client {
  constructor() {
    this.cookie = null;
  }

  async request(method, url, { body, headers = {}, bearer, form } = {}) {
    const init = { method, headers: { ...headers } };
    if (bearer) init.headers.authorization = `Bearer ${bearer}`;
    else if (this.cookie) init.headers.cookie = `lgs_token=${this.cookie}`;
    if (form) init.body = form;
    else if (body !== undefined) {
      init.headers['content-type'] = 'application/json';
      init.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(BASE + url, init);
    for (const cookie of response.headers.getSetCookie()) {
      const match = /^lgs_token=([^;]*)/.exec(cookie);
      if (match) this.cookie = match[1] || null;
    }
    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* not JSON (static files) */
    }
    return { status: response.status, json, data: json?.data, headers: response.headers, text };
  }

  get(url, options) {
    return this.request('GET', url, options);
  }
  post(url, body, options) {
    return this.request('POST', url, { body, ...options });
  }
  put(url, body, options) {
    return this.request('PUT', url, { body, ...options });
  }
  patch(url, body, options) {
    return this.request('PATCH', url, { body, ...options });
  }
  delete(url, options) {
    return this.request('DELETE', url, options);
  }
}

/** Asserts the status code and the response envelope. Returns `data` (or the body for errors). */
function expect(response, status) {
  assert.equal(response.status, status, `expected HTTP ${status}, got ${response.status}: ${response.text.slice(0, 400)}`);
  assert.ok(response.json, 'response is not JSON');
  if (status < 400) {
    assert.equal(response.json.success, true, 'success flag should be true');
    assert.ok('data' in response.json, 'success envelope must contain data');
    return response.data;
  }
  assert.equal(response.json.success, false, 'success flag should be false');
  assert.equal(typeof response.json.message, 'string', 'error envelope must contain a message');
  assert.ok(!('stack' in response.json) || status === 500, 'no stack on handled errors');
  return response.json;
}

/** Asserts a 400 whose errors[] mention every given field path. */
function expectFieldErrors(response, paths, status = 400) {
  const body = expect(response, status);
  assert.ok(Array.isArray(body.errors), `expected field errors, got: ${response.text.slice(0, 300)}`);
  const got = body.errors.map((item) => item.path);
  for (const fieldPath of paths) assert.ok(got.includes(fieldPath), `missing error for "${fieldPath}" (got ${got.join(', ')})`);
  for (const item of body.errors) assert.equal(typeof item.message, 'string');
}

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const fakeId = () => crypto.randomBytes(12).toString('hex');

const guest = new Client();
const alice = new Client(); // customer 1
const bob = new Client(); // customer 2
const admin = new Client();

const suffix = crypto.randomBytes(4).toString('hex');
const alicePassword = crypto.randomBytes(12).toString('base64url');
const bobPassword = crypto.randomBytes(12).toString('base64url');
const adminPassword = crypto.randomBytes(18).toString('base64url');
const aliceEmail = `alice.${suffix}@example.com`;
const bobEmail = `bob.${suffix}@example.com`;
const adminEmail = `admin.${suffix}@example.com`;

const address = { address: '12 Rose Lane, Andheri West', city: 'Mumbai', state: 'Maharashtra', pinCode: '400058' };
const customerOf = (name, emailAddress, phone = '9876543210') => ({ fullName: name, email: emailAddress, phone });

/** Shared state filled in as the tests go. */
const ctx = {};

async function productBySlug(slug) {
  const { product } = expect(await guest.get(`/api/products/${slug}`), 200);
  return product;
}
const variantOf = (product, size) => product.variants.find((variant) => variant.size === size);

// ---------------------------------------------------------------------------
section('Config and plumbing');
// ---------------------------------------------------------------------------

await test('seed inserted 6 categories and 44 products', () => {
  assert.equal(seedResult.categoriesTotal, 6);
  assert.equal(seedResult.productsTotal, 44);
});

await test('GET /api/health', async () => {
  assert.deepEqual(expect(await guest.get('/api/health'), 200), { status: 'ok' });
});

await test('GET /api/config exposes public settings only', async () => {
  const data = expect(await guest.get('/api/config'), 200);
  assert.deepEqual(data, {
    whatsappNumber: '910000000000',
    deliveryCharge: DELIVERY_CHARGE,
    freeDeliveryAbove: FREE_DELIVERY_ABOVE,
    paymentMethods: ['cod', 'manual'],
    razorpayEnabled: false,
  });
});

await test('unknown route returns the 404 error envelope', async () => {
  expect(await guest.get('/api/does-not-exist'), 404);
  expect(await guest.get('/nowhere'), 404);
});

await test('malformed JSON body returns 400', async () => {
  expect(await guest.post('/api/auth/login', '{"email": '), 400);
});

await test('security headers and CORS are restricted to FRONTEND_URL', async () => {
  const allowed = await guest.get('/api/health', { headers: { origin: FRONTEND } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), FRONTEND);
  assert.equal(allowed.headers.get('access-control-allow-credentials'), 'true');
  assert.equal(allowed.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(allowed.headers.get('x-powered-by'), null);

  const other = await guest.get('/api/health', { headers: { origin: 'https://evil.example' } });
  assert.equal(other.headers.get('access-control-allow-origin'), null);

  const forged = await guest.post('/api/newsletter/subscribe', { email: 'csrf@example.com' }, { headers: { origin: 'https://evil.example' } });
  expect(forged, 403);
});

// ---------------------------------------------------------------------------
section('Catalogue');
// ---------------------------------------------------------------------------

await test('GET /api/products: 44 products, default page size 24', async () => {
  const data = expect(await guest.get('/api/products'), 200);
  assert.equal(data.total, 44);
  assert.equal(data.items.length, 24);
  assert.equal(data.page, 1);
  assert.equal(data.pages, 2);
  assert.equal(data.limit, 24);
  assert.equal(data.items[0].isFeatured, true, 'default sort puts featured products first');

  const item = data.items[0];
  for (const key of ['_id', 'name', 'slug', 'description', 'category', 'basePrice', 'priceUnit', 'images', 'colours', 'variants', 'hasVariants', 'customisable', 'stock', 'isAvailable', 'inStock', 'isFeatured', 'ratingAverage', 'ratingCount', 'createdAt']) {
    assert.ok(key in item, `product is missing "${key}"`);
  }
  assert.deepEqual(Object.keys(item.category).sort(), ['_id', 'name', 'slug', 'theme']);
  assert.ok(isNumber(item.basePrice), 'basePrice must be a plain number');
  assert.ok(!('id' in item) && !('__v' in item));
});

await test('GET /api/products?limit=100 returns everything; limit is capped at 100', async () => {
  const data = expect(await guest.get('/api/products?limit=100'), 200);
  assert.equal(data.items.length, 44);
  assert.ok(data.items.every((item) => item.inStock && item.isAvailable));
  assert.equal(expect(await guest.get('/api/products?limit=5000'), 200).limit, 100);
});

await test('GET /api/categories: 6 categories in sortOrder with product counts', async () => {
  const { items } = expect(await guest.get('/api/categories'), 200);
  assert.deepEqual(
    items.map((category) => [category.slug, category.productCount]),
    [['little-charms', 12], ['little-clips', 12], ['little-love-blooms', 6], ['tiny-gardens', 4], ['mangal-dwaar', 4], ['subh-jyoti', 6]],
  );
  for (const key of ['_id', 'name', 'slug', 'description', 'image', 'theme', 'sortOrder', 'productCount']) assert.ok(key in items[0]);
  ctx.categories = Object.fromEntries(items.map((category) => [category.slug, category]));
});

await test('filter by category slug', async () => {
  const data = expect(await guest.get('/api/products?category=little-charms&limit=100'), 200);
  assert.equal(data.total, 12);
  assert.ok(data.items.every((item) => item.category.slug === 'little-charms' && item.basePrice === 50));
  assert.equal(expect(await guest.get('/api/products?category=no-such-category'), 200).total, 0);
});

await test('search: partial, case-insensitive, also matches category names, input is escaped', async () => {
  const lower = expect(await guest.get('/api/products?search=rose'), 200);
  const upper = expect(await guest.get('/api/products?search=ROSE'), 200);
  assert.equal(lower.total, 2);
  assert.equal(upper.total, 2);
  assert.deepEqual(lower.items.map((item) => item.slug).sort(), ['red-rose-keychain', 'rose-clips']);

  assert.equal(expect(await guest.get('/api/products?search=butterf'), 200).total, 2);
  assert.equal(expect(await guest.get('/api/products?search=mangal'), 200).total, 4);
  assert.equal(expect(await guest.get('/api/products?search=red%20rose'), 200).total, 1);
  assert.equal(expect(await guest.get(`/api/products?search=${encodeURIComponent('.*(')}`), 200).total, 0);
});

await test('price range filter', async () => {
  const data = expect(await guest.get('/api/products?minPrice=200&maxPrice=300&limit=100'), 200);
  assert.equal(data.total, 13); // 4 Tiny Gardens (299) + 3 Mangal Dwaar (249) + 6 Subh Jyoti (249)
  assert.ok(data.items.every((item) => item.basePrice >= 200 && item.basePrice <= 300));
});

await test('featured and available filters', async () => {
  const featured = expect(await guest.get('/api/products?featured=true&limit=100'), 200);
  assert.equal(featured.total, 8);
  assert.ok(featured.items.every((item) => item.isFeatured));
  assert.equal(expect(await guest.get('/api/products?available=true'), 200).total, 44);
});

await test('sorting', async () => {
  const prices = async (sort) => expect(await guest.get(`/api/products?sort=${sort}&limit=100`), 200).items;
  const ascending = (await prices('price_asc')).map((item) => item.basePrice);
  assert.deepEqual(ascending, [...ascending].sort((a, b) => a - b));
  assert.equal(ascending[0], 50);
  const descending = await prices('price_desc');
  assert.equal(descending[0].slug, 'sajni-toran');
  assert.equal(descending[0].basePrice, 399);

  const names = (await prices('name_asc')).map((item) => item.name.toLowerCase());
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
  const reversed = (await prices('name_desc')).map((item) => item.name.toLowerCase());
  assert.deepEqual(reversed, [...names].reverse());

  const newest = (await prices('newest')).map((item) => Date.parse(item.createdAt));
  assert.deepEqual(newest, [...newest].sort((a, b) => b - a));
});

await test('pagination', async () => {
  const page2 = expect(await guest.get('/api/products?page=2&limit=10&sort=name_asc'), 200);
  assert.equal(page2.items.length, 10);
  assert.equal(page2.page, 2);
  assert.equal(page2.pages, 5);
  const page5 = expect(await guest.get('/api/products?page=5&limit=10&sort=name_asc'), 200);
  assert.equal(page5.items.length, 4);
});

await test('invalid query parameters return 400 with field errors', async () => {
  expectFieldErrors(await guest.get('/api/products?sort=cheapest&minPrice=abc&page=0'), ['sort', 'minPrice', 'page']);
});

await test('GET /api/products/:slug with variants and related products', async () => {
  const { product, related } = expect(await guest.get('/api/products/phool-jhilmil'), 200);
  assert.equal(product.name, 'Phool Jhilmil');
  assert.equal(product.hasVariants, true);
  assert.equal(product.basePrice, 249);
  assert.equal(product.priceUnit, '2 pieces');
  assert.deepEqual(product.variants.map((variant) => [variant.size, variant.price, variant.stock, variant.isAvailable]), [['Small', 249, 20, true], ['Medium', 349, 20, true]]);
  assert.ok(product.variants.every((variant) => /^[a-f0-9]{24}$/.test(variant._id)));
  assert.deepEqual(Object.keys(product.category).sort(), ['_id', 'name', 'slug', 'theme']);
  assert.equal(related.length, 3);
  assert.ok(related.every((item) => item.category.slug === 'mangal-dwaar' && item.slug !== 'phool-jhilmil'));

  const charm = expect(await guest.get('/api/products/red-rose-keychain'), 200);
  assert.equal(charm.product.hasVariants, false);
  assert.equal(charm.product.basePrice, 50);
  assert.equal(charm.product.stock, 20);
  assert.equal(charm.product.inStock, true);
  assert.equal(charm.related.length, 4);

  expect(await guest.get('/api/products/no-such-product'), 404);

  ctx.redRose = charm.product;
  ctx.sunnySmile = await productBySlug('sunny-smile-keychain');
  ctx.phool = product;
  ctx.phoolMedium = variantOf(product, 'Medium');
  ctx.goldenGarden = await productBySlug('golden-garden');
  ctx.honeyPot = await productBySlug('honey-pot');
});

// ---------------------------------------------------------------------------
section('Auth');
// ---------------------------------------------------------------------------

await test('register validates input (400 with field errors)', async () => {
  expectFieldErrors(await guest.post('/api/auth/register', { name: 'A', email: 'not-an-email', password: 'short' }), ['name', 'email', 'password']);
  expectFieldErrors(await guest.post('/api/auth/register', {}), ['name', 'email', 'password']);
});

await test('register creates a customer, sets an httpOnly cookie and ignores "role"', async () => {
  const response = await alice.post('/api/auth/register', { name: 'Alice Smoke', email: aliceEmail.toUpperCase(), password: alicePassword, phone: '+91 98765 43210', role: 'admin' });
  const data = expect(response, 201);
  assert.deepEqual(Object.keys(data.user).sort(), ['_id', 'createdAt', 'email', 'name', 'phone', 'role']);
  assert.equal(data.user.role, 'customer', 'public registration must never create an admin');
  assert.equal(data.user.email, aliceEmail);
  assert.equal(data.user.phone, '9876543210');
  assert.ok(!response.text.includes('passwordHash'));

  const cookie = response.headers.getSetCookie().find((value) => value.startsWith('lgs_token='));
  assert.ok(cookie, 'lgs_token cookie should be set');
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
  assert.ok(alice.cookie);
  ctx.alice = data.user;

  const stored = await User.findById(data.user._id).select('+passwordHash');
  assert.equal(stored.role, 'customer');
  assert.match(stored.passwordHash, /^\$2[aby]\$12\$/, 'password must be stored as a bcrypt hash with cost 12');
});

await test('duplicate email is a 409', async () => {
  expect(await guest.post('/api/auth/register', { name: 'Alice Again', email: aliceEmail, password: alicePassword }), 409);
});

await test('login: wrong password and unknown email give the same 401', async () => {
  const wrong = expect(await guest.post('/api/auth/login', { email: aliceEmail, password: `${alicePassword}x` }), 401);
  const unknown = expect(await guest.post('/api/auth/login', { email: `nobody.${suffix}@example.com`, password: alicePassword }), 401);
  assert.equal(wrong.message, unknown.message);
});

await test('login rejects NoSQL operator payloads', async () => {
  expect(await guest.post('/api/auth/login', { email: { $gt: '' }, password: { $gt: '' } }), 400);
});

await test('login, /me via cookie and via Bearer token, logout', async () => {
  const fresh = new Client();
  const data = expect(await fresh.post('/api/auth/login', { email: aliceEmail, password: alicePassword }), 200);
  assert.equal(data.user._id, ctx.alice._id);
  assert.ok(fresh.cookie);

  assert.equal(expect(await fresh.get('/api/auth/me'), 200).user.email, aliceEmail);
  assert.equal(expect(await guest.get('/api/auth/me', { bearer: fresh.cookie }), 200).user.email, aliceEmail);

  expect(await fresh.post('/api/auth/logout'), 200);
  assert.equal(fresh.cookie, null, 'logout should clear the cookie');
  expect(await fresh.get('/api/auth/me'), 401);
});

await test('unauthenticated and forged tokens get 401', async () => {
  expect(await guest.get('/api/auth/me'), 401);
  expect(await guest.get('/api/auth/me', { bearer: 'not.a.token' }), 401);
  expect(await guest.get('/api/cart'), 401);
  expect(await guest.get('/api/wishlist'), 401);
  expect(await guest.get('/api/orders/my-orders'), 401);
});

await test('register second customer', async () => {
  ctx.bob = expect(await bob.post('/api/auth/register', { name: 'Bob Smoke', email: bobEmail, password: bobPassword }), 201).user;
});

// ---------------------------------------------------------------------------
section('Cart');
// ---------------------------------------------------------------------------

await test('empty cart', async () => {
  assert.deepEqual(expect(await alice.get('/api/cart'), 200), { items: [], subtotal: 0, itemCount: 0 });
});

await test('add a product; server computes prices', async () => {
  const cart = expect(await alice.post('/api/cart', { productId: ctx.redRose._id, quantity: 2, unitPrice: 1, price: 1 }), 200);
  assert.equal(cart.items.length, 1);
  const [line] = cart.items;
  assert.deepEqual(Object.keys(line).sort(), ['_id', 'available', 'colour', 'customisation', 'lineTotal', 'maxQuantity', 'product', 'quantity', 'size', 'unitPrice', 'variantId']);
  assert.deepEqual(Object.keys(line.product).sort(), ['_id', 'category', 'hasVariants', 'images', 'inStock', 'isAvailable', 'name', 'priceUnit', 'slug']);
  assert.deepEqual(line.product.category, { name: 'Little Charms', slug: 'little-charms' });
  assert.equal(line.unitPrice, 50);
  assert.equal(line.lineTotal, 100);
  assert.equal(line.quantity, 2);
  assert.equal(line.available, true);
  assert.equal(line.maxQuantity, 20);
  assert.equal(line.size, null);
  assert.equal(line.variantId, null);
  assert.deepEqual(line.customisation, { instructions: '', message: '' });
  assert.equal(cart.subtotal, 100);
  assert.equal(cart.itemCount, 2);
});

await test('identical line adds quantities; different customisation makes a new line', async () => {
  let cart = expect(await alice.post('/api/cart', { productId: ctx.redRose._id, quantity: 1 }), 200);
  assert.equal(cart.items.length, 1);
  assert.equal(cart.items[0].quantity, 3);

  cart = expect(await alice.post('/api/cart', { productId: ctx.redRose._id, quantity: 1, colour: 'Pink', customisation: { message: 'Happy Birthday' } }), 200);
  assert.equal(cart.items.length, 2);
  assert.equal(cart.items[1].colour, 'Pink');
  assert.equal(cart.items[1].customisation.message, 'Happy Birthday');
  assert.equal(cart.subtotal, 200);
  assert.equal(cart.itemCount, 4);
});

await test('variant rules in the cart', async () => {
  expect(await alice.post('/api/cart', { productId: ctx.phool._id, quantity: 1 }), 422); // size required
  expect(await alice.post('/api/cart', { productId: ctx.redRose._id, variantId: ctx.phoolMedium._id, quantity: 1 }), 422); // no sizes
  expect(await alice.post('/api/cart', { productId: ctx.phool._id, variantId: fakeId(), quantity: 1 }), 422); // unknown size

  const cart = expect(await alice.post('/api/cart', { productId: ctx.phool._id, variantId: ctx.phoolMedium._id, quantity: 2 }), 200);
  const line = cart.items.find((item) => item.product.slug === 'phool-jhilmil');
  assert.equal(line.size, 'Medium');
  assert.equal(line.variantId, ctx.phoolMedium._id);
  assert.equal(line.unitPrice, 349);
  assert.equal(line.lineTotal, 698);
  assert.equal(cart.subtotal, 898);
  ctx.cartPhoolLine = line._id;
  ctx.cartRoseLine = cart.items[0]._id;
});

await test('cart validation: quantity 1-20, stock, unknown product', async () => {
  expectFieldErrors(await alice.post('/api/cart', { productId: ctx.redRose._id, quantity: 21 }), ['quantity']);
  expectFieldErrors(await alice.post('/api/cart', { productId: 'nope', quantity: 0 }), ['productId', 'quantity']);
  expectFieldErrors(await alice.post('/api/cart', { productId: ctx.redRose._id, quantity: 1, customisation: { message: 'x'.repeat(301) } }), ['customisation.message']);
  expect(await alice.post('/api/cart', { productId: ctx.redRose._id, quantity: 20 }), 422); // 3 + 20 > 20 in stock
  expect(await alice.post('/api/cart', { productId: fakeId(), quantity: 1 }), 404);
});

await test('update a cart line', async () => {
  let cart = expect(await alice.put(`/api/cart/${ctx.cartRoseLine}`, { quantity: 5 }), 200);
  assert.equal(cart.items[0].quantity, 5);
  assert.equal(cart.items[0].lineTotal, 250);

  cart = expect(await alice.put(`/api/cart/${ctx.cartRoseLine}`, { colour: 'Red', customisation: { instructions: 'Gift wrap please' } }), 200);
  assert.equal(cart.items[0].colour, 'Red');
  assert.equal(cart.items[0].customisation.instructions, 'Gift wrap please');
  assert.equal(cart.items[0].quantity, 5);

  expectFieldErrors(await alice.put(`/api/cart/${ctx.cartRoseLine}`, { quantity: 99 }), ['quantity']);
  expect(await alice.put(`/api/cart/${fakeId()}`, { quantity: 1 }), 404);
  expect(await bob.put(`/api/cart/${ctx.cartRoseLine}`, { quantity: 1 }), 404); // someone else's line
});

await test('delete a line, then clear the cart', async () => {
  let cart = expect(await alice.delete(`/api/cart/${ctx.cartPhoolLine}`), 200);
  assert.ok(!cart.items.some((item) => item._id === ctx.cartPhoolLine));
  expect(await alice.delete(`/api/cart/${ctx.cartPhoolLine}`), 404);

  cart = expect(await alice.delete('/api/cart'), 200);
  assert.deepEqual(cart, { items: [], subtotal: 0, itemCount: 0 });
});

await test('merge a guest cart: bad lines are skipped, not an error', async () => {
  const cart = expect(
    await alice.post('/api/cart/merge', {
      items: [
        { productId: ctx.sunnySmile._id, quantity: 2 },
        { productId: fakeId(), quantity: 1 }, // unknown product
        { productId: ctx.phool._id, quantity: 1 }, // size missing
        { productId: 'garbage', quantity: 'many' }, // invalid shape
        { productId: ctx.phool._id, variantId: ctx.phoolMedium._id, quantity: 1 },
      ],
    }),
    200,
  );
  assert.deepEqual(cart.items.map((item) => [item.product.slug, item.quantity]), [['sunny-smile-keychain', 2], ['phool-jhilmil', 1]]);
  assert.equal(cart.subtotal, 449);
  expectFieldErrors(await alice.post('/api/cart/merge', { items: 'nope' }), ['items']);
});

// ---------------------------------------------------------------------------
section('Wishlist');
// ---------------------------------------------------------------------------

await test('wishlist add / duplicate / list / merge / remove', async () => {
  assert.deepEqual(expect(await alice.get('/api/wishlist'), 200), { items: [] });

  let data = expect(await alice.post('/api/wishlist', { productId: ctx.redRose._id }), 200);
  assert.equal(data.items.length, 1);
  assert.equal(data.items[0].slug, 'red-rose-keychain');
  assert.equal(data.items[0].category.slug, 'little-charms');
  assert.ok(isNumber(data.items[0].basePrice));

  data = expect(await alice.post('/api/wishlist', { productId: ctx.redRose._id }), 200);
  assert.equal(data.items.length, 1, 'adding twice must not duplicate');

  expect(await alice.post('/api/wishlist', { productId: fakeId() }), 404);
  expectFieldErrors(await alice.post('/api/wishlist', { productId: 'nope' }), ['productId']);

  data = expect(await alice.post('/api/wishlist/merge', { productIds: [ctx.phool._id, ctx.redRose._id, fakeId(), 'garbage'] }), 200);
  assert.deepEqual(data.items.map((item) => item.slug).sort(), ['phool-jhilmil', 'red-rose-keychain']);

  data = expect(await alice.delete(`/api/wishlist/${ctx.redRose._id}`), 200);
  assert.deepEqual(data.items.map((item) => item.slug), ['phool-jhilmil']);
  assert.deepEqual(expect(await alice.get('/api/wishlist'), 200).items.map((item) => item.slug), ['phool-jhilmil']);
});

// ---------------------------------------------------------------------------
section('Orders');
// ---------------------------------------------------------------------------

const orderBody = (customer, items, extra = {}) => ({ customer, shippingAddress: address, paymentMethod: 'cod', items, ...extra });
const ORDER_KEYS = ['_id', 'orderNumber', 'user', 'customer', 'shippingAddress', 'deliveryInstructions', 'orderNotes', 'items', 'subtotal', 'deliveryCharge', 'total', 'paymentMethod', 'paymentStatus', 'paymentReference', 'paidAt', 'status', 'statusHistory', 'createdAt'];
const ORDER_ITEM_KEYS = ['product', 'name', 'slug', 'image', 'categoryName', 'size', 'colour', 'quantity', 'unitPrice', 'lineTotal', 'priceUnit', 'customisation'];

await test('order validation: phone, PIN code, email, payment method, items (400 + field errors)', async () => {
  const bad = orderBody({ fullName: 'G', email: 'nope', phone: '12345' }, [], { shippingAddress: { ...address, pinCode: '4000' }, paymentMethod: 'card' });
  expectFieldErrors(await guest.post('/api/orders', bad), ['customer.fullName', 'customer.email', 'customer.phone', 'shippingAddress.pinCode', 'paymentMethod', 'items']);
  expectFieldErrors(await guest.post('/api/orders', orderBody(customerOf('Guest Buyer', 'guest@example.com', '5876543210'), [{ productId: ctx.redRose._id, quantity: 0 }])), ['customer.phone', 'items.0.quantity']);
  expectFieldErrors(await guest.post('/api/orders', {}), ['customer', 'shippingAddress', 'paymentMethod', 'items']);
});

await test('guest order: totals computed by the server, client prices ignored, payment stays pending', async () => {
  const body = orderBody(
    customerOf('Guest Buyer', 'Guest.Buyer@Example.com', '+91 98765-43210'),
    [{ productId: ctx.redRose._id, quantity: 2, colour: 'Red', unitPrice: 1, price: 1, lineTotal: 2, customisation: { message: 'With love' } }],
    { total: 1, subtotal: 1, deliveryCharge: 0, paymentStatus: 'paid', status: 'delivered', orderNumber: 'HACK', deliveryInstructions: 'Ring the bell' },
  );
  const { order } = expect(await guest.post('/api/orders', body), 201);

  for (const key of ORDER_KEYS) assert.ok(key in order, `order is missing "${key}"`);
  assert.match(order.orderNumber, /^LGS-\d{6}-[A-Z0-9]{4}$/);
  assert.equal(order.user, null);
  assert.deepEqual(order.customer, { fullName: 'Guest Buyer', email: 'guest.buyer@example.com', phone: '9876543210' });
  assert.deepEqual(order.shippingAddress, address);
  assert.equal(order.deliveryInstructions, 'Ring the bell');
  assert.equal(order.subtotal, 100);
  assert.equal(order.deliveryCharge, DELIVERY_CHARGE);
  assert.equal(order.total, 140);
  assert.equal(order.paymentMethod, 'cod');
  assert.equal(order.paymentStatus, 'pending', 'an order must never be paid automatically');
  assert.equal(order.paidAt, null);
  assert.equal(order.status, 'placed');
  assert.equal(order.statusHistory.length, 1);
  assert.equal(order.statusHistory[0].status, 'placed');

  const [item] = order.items;
  for (const key of ORDER_ITEM_KEYS) assert.ok(key in item, `order item is missing "${key}"`);
  assert.equal(item.product, ctx.redRose._id);
  assert.equal(item.name, 'Red Rose');
  assert.equal(item.slug, 'red-rose-keychain');
  assert.equal(item.image, '/images/products/red-rose-keychain.webp');
  assert.equal(item.categoryName, 'Little Charms');
  assert.equal(item.size, null);
  assert.equal(item.colour, 'Red');
  assert.equal(item.quantity, 2);
  assert.equal(item.unitPrice, 50);
  assert.equal(item.lineTotal, 100);
  assert.equal(item.priceUnit, 'each');
  assert.deepEqual(item.customisation, { instructions: '', message: 'With love' });

  assert.equal((await productBySlug('red-rose-keychain')).stock, 18, 'stock should drop by 2');
  ctx.guestOrder = order;
});

await test('authenticated order: user attached, variant snapshot, free delivery threshold, cart cleared', async () => {
  assert.equal(expect(await alice.get('/api/cart'), 200).items.length, 2);

  const body = orderBody(
    customerOf('Alice Smoke', aliceEmail),
    [
      { productId: ctx.phool._id, variantId: ctx.phoolMedium._id, quantity: 2 },
      { productId: ctx.sunnySmile._id, quantity: 1 },
    ],
    { paymentMethod: 'manual', orderNotes: 'Festival gift' },
  );
  const { order } = expect(await alice.post('/api/orders', body), 201);

  assert.equal(order.user, ctx.alice._id);
  assert.equal(order.subtotal, 748);
  assert.equal(order.deliveryCharge, 0, 'subtotal is above FREE_DELIVERY_ABOVE');
  assert.equal(order.total, 748);
  assert.equal(order.paymentMethod, 'manual');
  assert.equal(order.paymentStatus, 'pending', 'manual payments also start pending');
  assert.equal(order.orderNotes, 'Festival gift');
  assert.deepEqual(order.items.map((item) => [item.name, item.size, item.quantity, item.unitPrice, item.lineTotal]), [['Phool Jhilmil', 'Medium', 2, 349, 698], ['Sunny Smile', null, 1, 50, 50]]);
  assert.equal(order.items[0].categoryName, 'Mangal Dwaar');
  assert.ok([order.subtotal, order.deliveryCharge, order.total, order.items[0].unitPrice, order.items[0].lineTotal].every(isNumber));

  const phool = await productBySlug('phool-jhilmil');
  assert.equal(variantOf(phool, 'Medium').stock, 18);
  assert.equal(variantOf(phool, 'Small').stock, 20);
  assert.equal((await productBySlug('sunny-smile-keychain')).stock, 19);

  assert.deepEqual(expect(await alice.get('/api/cart'), 200), { items: [], subtotal: 0, itemCount: 0 }, 'server cart is cleared after ordering');
  ctx.aliceOrder1 = order;
});

await test('out of stock is a 422 and nothing is decremented (transaction rolls back)', async () => {
  const body = orderBody(customerOf('Alice Smoke', aliceEmail), [
    { productId: ctx.sunnySmile._id, quantity: 1 },
    { productId: ctx.redRose._id, quantity: 19 }, // only 18 left
  ]);
  const response = await alice.post('/api/orders', body);
  expectFieldErrors(response, ['items.1.quantity'], 422);
  assert.equal((await productBySlug('sunny-smile-keychain')).stock, 19);
  assert.equal((await productBySlug('red-rose-keychain')).stock, 18);

  // The same product split over two lines is counted together.
  const split = orderBody(customerOf('Alice Smoke', aliceEmail), [
    { productId: ctx.redRose._id, quantity: 10 },
    { productId: ctx.redRose._id, quantity: 10, colour: 'Pink' },
  ]);
  expect(await alice.post('/api/orders', split), 422);
  assert.equal((await productBySlug('red-rose-keychain')).stock, 18);
});

await test('order item rules: size required / not allowed, unknown product', async () => {
  const one = (item) => orderBody(customerOf('Guest Buyer', 'guest@example.com'), [item]);
  expectFieldErrors(await guest.post('/api/orders', one({ productId: ctx.phool._id, quantity: 1 })), ['items.0.variantId'], 422);
  expectFieldErrors(await guest.post('/api/orders', one({ productId: ctx.redRose._id, variantId: ctx.phoolMedium._id, quantity: 1 })), ['items.0.variantId'], 422);
  expectFieldErrors(await guest.post('/api/orders', one({ productId: fakeId(), quantity: 1 })), ['items.0.productId'], 422);
});

await test('my-orders lists own orders, newest first', async () => {
  const body = orderBody(customerOf('Alice Smoke', aliceEmail), [{ productId: ctx.sunnySmile._id, quantity: 3 }]);
  const { order } = expect(await alice.post('/api/orders', body), 201);
  assert.equal(order.subtotal, 150);
  assert.equal(order.deliveryCharge, DELIVERY_CHARGE);
  assert.equal(order.total, 190);
  assert.equal((await productBySlug('sunny-smile-keychain')).stock, 16);
  ctx.aliceOrder2 = order;

  const { items } = expect(await alice.get('/api/orders/my-orders'), 200);
  assert.deepEqual(items.map((item) => item.orderNumber), [ctx.aliceOrder2.orderNumber, ctx.aliceOrder1.orderNumber]);
  assert.ok(items.every((item) => isNumber(item.total)));
  assert.deepEqual(expect(await bob.get('/api/orders/my-orders'), 200).items, []);
});

await test('GET /api/orders/:id is limited to the owner', async () => {
  assert.equal(expect(await alice.get(`/api/orders/${ctx.aliceOrder1._id}`), 200).order.orderNumber, ctx.aliceOrder1.orderNumber);
  expect(await bob.get(`/api/orders/${ctx.aliceOrder1._id}`), 404);
  expect(await alice.get(`/api/orders/${ctx.guestOrder._id}`), 404);
  expect(await guest.get(`/api/orders/${ctx.aliceOrder1._id}`), 401);
  expect(await alice.get(`/api/orders/${fakeId()}`), 404);
  expectFieldErrors(await alice.get('/api/orders/not-an-id'), ['id']);
});

await test('customer cancels a placed order: stock restored, history appended', async () => {
  expect(await bob.patch(`/api/orders/${ctx.aliceOrder2._id}/cancel`), 404);
  expect(await guest.patch(`/api/orders/${ctx.aliceOrder2._id}/cancel`), 401);

  const { order } = expect(await alice.patch(`/api/orders/${ctx.aliceOrder2._id}/cancel`), 200);
  assert.equal(order.status, 'cancelled');
  assert.deepEqual(order.statusHistory.map((entry) => entry.status), ['placed', 'cancelled']);
  assert.equal(order.statusHistory[1].by, ctx.alice._id);
  assert.equal((await productBySlug('sunny-smile-keychain')).stock, 19, 'cancelled quantity returns to stock');

  expect(await alice.patch(`/api/orders/${ctx.aliceOrder2._id}/cancel`), 422);
  assert.equal((await productBySlug('sunny-smile-keychain')).stock, 19, 'stock is not restored twice');
});

await test('second customer places an order that stays open', async () => {
  const body = orderBody(customerOf('Bob Smoke', bobEmail, '919812345678'), [{ productId: ctx.goldenGarden._id, quantity: 2 }]);
  const { order } = expect(await bob.post('/api/orders', body), 201);
  assert.equal(order.total, 598);
  assert.equal(order.deliveryCharge, 0);
  assert.equal(order.customer.phone, '9812345678');
  ctx.bobOrder = order;
});

// ---------------------------------------------------------------------------
section('Reviews');
// ---------------------------------------------------------------------------

await test('create a review and recompute the product rating', async () => {
  expect(await guest.post(`/api/products/${ctx.redRose._id}/reviews`, { rating: 5, comment: 'Lovely!' }), 401);
  expectFieldErrors(await alice.post(`/api/products/${ctx.redRose._id}/reviews`, { rating: 6, comment: '' }), ['rating', 'comment']);
  expect(await alice.post(`/api/products/${fakeId()}/reviews`, { rating: 5, comment: 'Lovely!' }), 404);

  const { review } = expect(await alice.post(`/api/products/${ctx.redRose._id}/reviews`, { rating: 5, title: 'So cute', comment: 'Beautifully made keychain.' }), 201);
  assert.equal(review.rating, 5);
  assert.deepEqual(review.user, { name: 'Alice Smoke' });

  const product = await productBySlug('red-rose-keychain');
  assert.equal(product.ratingAverage, 5);
  assert.equal(product.ratingCount, 1);
});

await test('duplicate review is rejected with 409', async () => {
  expect(await alice.post(`/api/products/${ctx.redRose._id}/reviews`, { rating: 1, comment: 'Changed my mind' }), 409);
  assert.equal((await productBySlug('red-rose-keychain')).ratingCount, 1);
});

await test('list product reviews and recent reviews', async () => {
  expect(await bob.post(`/api/products/${ctx.redRose._id}/reviews`, { rating: 4, comment: 'Very nice gift.' }), 201);

  const data = expect(await guest.get(`/api/products/${ctx.redRose._id}/reviews`), 200);
  assert.equal(data.total, 2);
  assert.equal(data.average, 4.5);
  assert.equal(data.items.length, 2);
  assert.deepEqual(Object.keys(data.items[0]).sort(), ['_id', 'comment', 'createdAt', 'rating', 'title', 'user']);
  assert.deepEqual(data.items[0].user, { name: 'Bob Smoke' }); // newest first, and only the name is exposed
  ctx.bobReviewId = data.items[0]._id;

  const recent = expect(await guest.get('/api/reviews/recent?limit=6'), 200);
  assert.equal(recent.items.length, 2);
  assert.deepEqual(Object.keys(recent.items[0].product).sort(), ['images', 'name', 'slug']);
  assert.equal(recent.items[0].product.slug, 'red-rose-keychain');
  assert.deepEqual(Object.keys(recent.items[0].user), ['name']);
  assert.equal(expect(await guest.get('/api/reviews/recent?limit=1'), 200).items.length, 1);
});

// ---------------------------------------------------------------------------
section('Newsletter and contact');
// ---------------------------------------------------------------------------

await test('newsletter: 201 first time, friendly 200 when already subscribed', async () => {
  const email = `news.${suffix}@example.com`;
  expect(await guest.post('/api/newsletter/subscribe', { email }), 201);
  const again = await guest.post('/api/newsletter/subscribe', { email: email.toUpperCase() });
  expect(again, 200);
  assert.equal(typeof again.json.message, 'string');
  expectFieldErrors(await guest.post('/api/newsletter/subscribe', { email: 'nope' }), ['email']);
});

await test('contact form', async () => {
  expect(await guest.post('/api/contact', { type: 'business', name: 'Priya Shah', email: 'priya@example.com', phone: '+91 98200 00000', company: 'Gift Co', subject: 'Bulk order', message: 'We would like 200 keychains for an event.' }), 201);
  expect(await guest.post('/api/contact', { type: 'general', name: 'Ravi', email: 'ravi@example.com', message: 'Do you deliver to Pune?' }), 201);
  expectFieldErrors(await guest.post('/api/contact', { type: 'spam', name: 'X', email: 'x', message: 'short' }), ['type', 'name', 'email', 'message']);
});

// ---------------------------------------------------------------------------
section('Admin');
// ---------------------------------------------------------------------------

await test('admin account (created directly in the database) can log in', async () => {
  assert.equal((await ensureAdmin()).status, 'not_configured', 'no admin is created when ADMIN_* are empty');
  const created = await User.create({ name: 'Smoke Admin', email: adminEmail, passwordHash: await bcrypt.hash(adminPassword, BCRYPT_COST), role: 'admin' });
  const data = expect(await admin.post('/api/auth/login', { email: adminEmail, password: adminPassword }), 200);
  assert.equal(data.user.role, 'admin');
  ctx.admin = { _id: String(created._id) };
});

await test('admin endpoints: 401 for guests, 403 for customers', async () => {
  const calls = [
    ['GET', '/api/admin/dashboard'],
    ['GET', '/api/admin/products'],
    ['GET', '/api/admin/orders'],
    ['GET', `/api/admin/orders/${ctx.guestOrder._id}`],
    ['PATCH', `/api/admin/orders/${ctx.guestOrder._id}/status`, { status: 'confirmed' }],
    ['PATCH', `/api/admin/orders/${ctx.guestOrder._id}/payment`, { paymentStatus: 'paid' }],
    ['GET', '/api/admin/customers'],
    ['GET', '/api/admin/messages'],
    ['DELETE', `/api/admin/reviews/${ctx.bobReviewId}`],
    ['POST', '/api/products', { name: 'Hack', category: ctx.categories['little-charms']._id, basePrice: 1 }],
    ['PUT', `/api/products/${ctx.redRose._id}`, { basePrice: 1 }],
    ['DELETE', `/api/products/${ctx.redRose._id}`],
    ['POST', '/api/categories', { name: 'Hack' }],
    ['PUT', `/api/categories/${ctx.categories['little-charms']._id}`, { name: 'Hack' }],
    ['DELETE', `/api/categories/${ctx.categories['little-charms']._id}`],
    ['POST', '/api/uploads'],
  ];
  for (const [method, url, body] of calls) {
    expect(await guest.request(method, url, { body }), 401);
    expect(await alice.request(method, url, { body }), 403);
  }
  assert.equal((await productBySlug('red-rose-keychain')).basePrice, 50);
  assert.equal(expect(await guest.get(`/api/orders/${ctx.guestOrder._id}`, { bearer: alice.cookie }), 404).success, false);
});

await test('dashboard figures', async () => {
  const data = expect(await admin.get('/api/admin/dashboard'), 200);
  // guest 140 (placed) + alice#1 748 (placed) + alice#2 190 (cancelled) + bob 598 (placed)
  assert.equal(data.totalRevenue, 140 + 748 + 598);
  assert.equal(data.paidRevenue, 0);
  assert.equal(data.totalOrders, 4);
  assert.equal(data.pendingOrders, 3);
  assert.equal(data.completedOrders, 0);
  assert.equal(data.cancelledOrders, 1);
  assert.equal(data.totalProducts, 44);
  assert.equal(data.totalCustomers, 2);
  assert.deepEqual(data.ordersByStatus, { placed: 3, confirmed: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 1 });
  assert.equal(data.recentOrders.length, 4);
  assert.equal(data.recentOrders[0].orderNumber, ctx.bobOrder.orderNumber);
  assert.ok(data.recentOrders.every((order) => isNumber(order.total)));
});

await test('admin order list: filters and search', async () => {
  const all = expect(await admin.get('/api/admin/orders'), 200);
  assert.equal(all.total, 4);
  assert.deepEqual(Object.keys(all).sort(), ['items', 'limit', 'page', 'pages', 'total']);
  assert.equal(expect(await admin.get('/api/admin/orders?status=cancelled'), 200).total, 1);
  assert.equal(expect(await admin.get('/api/admin/orders?paymentStatus=pending'), 200).total, 4);
  assert.equal(expect(await admin.get(`/api/admin/orders?search=${ctx.guestOrder.orderNumber.toLowerCase()}`), 200).total, 1);
  assert.equal(expect(await admin.get('/api/admin/orders?search=guest%20buy'), 200).total, 1);
  assert.equal(expect(await admin.get('/api/admin/orders?search=9812345678'), 200).total, 1);
  assert.equal(expect(await admin.get('/api/admin/orders?limit=1&page=2'), 200).items.length, 1);
  expectFieldErrors(await admin.get('/api/admin/orders?status=lost'), ['status']);
  assert.equal(expect(await admin.get(`/api/admin/orders/${ctx.guestOrder._id}`), 200).order.orderNumber, ctx.guestOrder.orderNumber);
  expect(await admin.get(`/api/admin/orders/${fakeId()}`), 404);
  // Admins can also read any order through the customer endpoint.
  expect(await admin.get(`/api/orders/${ctx.aliceOrder1._id}`), 200);
});

await test('admin updates order status (history records who and when)', async () => {
  const url = `/api/admin/orders/${ctx.aliceOrder1._id}/status`;
  const { order } = expect(await admin.patch(url, { status: 'confirmed', note: 'Confirmed on WhatsApp' }), 200);
  assert.equal(order.status, 'confirmed');
  assert.deepEqual(order.statusHistory.map((entry) => entry.status), ['placed', 'confirmed']);
  assert.equal(order.statusHistory[1].note, 'Confirmed on WhatsApp');
  assert.equal(order.statusHistory[1].by, ctx.admin._id);
  assert.ok(Date.parse(order.statusHistory[1].at));
  assert.equal(order.paymentStatus, 'pending', 'changing status never touches payment');

  expectFieldErrors(await admin.patch(url, { status: 'teleported' }), ['status']);
  expect(await admin.patch(url, { status: 'confirmed' }), 422); // already confirmed
  expect(await alice.patch(`/api/orders/${ctx.aliceOrder1._id}/cancel`), 422); // customers can cancel only while "placed"
  assert.equal(variantOf(await productBySlug('phool-jhilmil'), 'Medium').stock, 18);
});

await test('only an admin can mark an order paid', async () => {
  const url = `/api/admin/orders/${ctx.aliceOrder1._id}/payment`;
  expectFieldErrors(await admin.patch(url, { paymentStatus: 'maybe' }), ['paymentStatus']);

  const { order } = expect(await admin.patch(url, { paymentStatus: 'paid', reference: 'UPI-TEST-123', note: 'Received on GPay' }), 200);
  assert.equal(order.paymentStatus, 'paid');
  assert.equal(order.paymentReference, 'UPI-TEST-123');
  assert.ok(Date.parse(order.paidAt));
  assert.equal(order.paymentHistory.at(-1).by, ctx.admin._id);
  assert.equal(order.status, 'confirmed', 'marking paid never changes the order status');

  const dashboard = expect(await admin.get('/api/admin/dashboard'), 200);
  assert.equal(dashboard.paidRevenue, 748);
  assert.equal(expect(await admin.get('/api/admin/orders?paymentStatus=paid'), 200).total, 1);
});

await test('admin cancels an order: stock restored; final states are locked', async () => {
  const url = `/api/admin/orders/${ctx.guestOrder._id}/status`;
  assert.equal((await productBySlug('red-rose-keychain')).stock, 18);
  const { order } = expect(await admin.patch(url, { status: 'cancelled', note: 'Customer changed their mind' }), 200);
  assert.equal(order.status, 'cancelled');
  assert.equal((await productBySlug('red-rose-keychain')).stock, 20, 'cancelling returns stock');

  expect(await admin.patch(url, { status: 'confirmed' }), 422);
  expect(await admin.patch(url, { status: 'cancelled' }), 422);
  assert.equal((await productBySlug('red-rose-keychain')).stock, 20, 'stock is never restored twice');

  const delivered = `/api/admin/orders/${ctx.aliceOrder1._id}/status`;
  expect(await admin.patch(delivered, { status: 'shipped' }), 200);
  assert.equal(expect(await admin.patch(delivered, { status: 'delivered' }), 200).order.status, 'delivered');
  expect(await admin.patch(delivered, { status: 'cancelled' }), 422);
  expect(await admin.patch(delivered, { status: 'processing' }), 422);
  assert.equal(variantOf(await productBySlug('phool-jhilmil'), 'Medium').stock, 18);

  const dashboard = expect(await admin.get('/api/admin/dashboard'), 200);
  assert.equal(dashboard.totalRevenue, 748 + 598);
  assert.deepEqual(dashboard.ordersByStatus, { placed: 1, confirmed: 0, processing: 0, shipped: 0, delivered: 1, cancelled: 2 });
  assert.equal(dashboard.pendingOrders, 1);
  assert.equal(dashboard.completedOrders, 1);
  assert.equal(dashboard.cancelledOrders, 2);
});

await test('customers list and detail', async () => {
  const data = expect(await admin.get('/api/admin/customers'), 200);
  assert.equal(data.total, 2, 'admins are not customers');
  const row = data.items.find((item) => item._id === ctx.alice._id);
  assert.deepEqual(Object.keys(row).sort(), ['_id', 'createdAt', 'email', 'name', 'orderCount', 'phone', 'totalSpent']);
  assert.equal(row.orderCount, 2);
  assert.equal(row.totalSpent, 748);
  assert.equal(expect(await admin.get('/api/admin/customers?search=bob'), 200).total, 1);

  const detail = expect(await admin.get(`/api/admin/customers/${ctx.alice._id}`), 200);
  assert.equal(detail.customer.email, aliceEmail);
  assert.equal(detail.orders.length, 2);
  expect(await admin.get(`/api/admin/customers/${ctx.admin._id}`), 404);
});

await test('contact messages: list and mark as read', async () => {
  const data = expect(await admin.get('/api/admin/messages'), 200);
  assert.equal(data.total, 2);
  const business = data.items.find((item) => item.type === 'business');
  assert.equal(business.company, 'Gift Co');
  assert.equal(business.isRead, false);
  const { item } = expect(await admin.patch(`/api/admin/messages/${business._id}/read`), 200);
  assert.equal(item.isRead, true);
  assert.equal(expect(await admin.get('/api/admin/messages?unread=true'), 200).total, 1);
  expect(await admin.patch(`/api/admin/messages/${fakeId()}/read`), 404);
});

await test('admin deletes a review and the rating is recomputed', async () => {
  expect(await admin.delete(`/api/admin/reviews/${ctx.bobReviewId}`), 200);
  const product = await productBySlug('red-rose-keychain');
  assert.equal(product.ratingAverage, 5);
  assert.equal(product.ratingCount, 1);
  expect(await admin.delete(`/api/admin/reviews/${ctx.bobReviewId}`), 404);
});

await test('product CRUD', async () => {
  const category = ctx.categories['tiny-gardens']._id;
  expectFieldErrors(await admin.post('/api/products', { name: 'X', category: 'nope', basePrice: -5 }), ['name', 'category', 'basePrice']);
  expectFieldErrors(await admin.post('/api/products', { name: 'No Price', category }), ['basePrice']);
  expectFieldErrors(await admin.post('/api/products', { name: 'Ghost Category', category: fakeId(), basePrice: 10 }), ['category']);

  // create: slug generated from the name
  const first = expect(await admin.post('/api/products', { name: 'Smoke Test Pot', description: 'Temporary', category, basePrice: 120, priceUnit: 'each', stock: 5, images: [{ url: '/uploads/example.webp', alt: 'Pot' }], colours: [{ name: 'Green', hex: '#00AA55' }] }), 201).product;
  assert.equal(first.slug, 'smoke-test-pot');
  assert.equal(first.basePrice, 120);
  assert.equal(first.stock, 5);
  assert.equal(first.inStock, true);
  assert.equal(first.category.slug, 'tiny-gardens');

  // same name again: slug is de-duplicated; variants drive basePrice
  const second = expect(await admin.post('/api/products', { name: 'Smoke Test Pot', category, basePrice: 999, variants: [{ size: 'Large', price: 450, stock: 2 }, { size: 'Small', price: 300, stock: 1 }] }), 201).product;
  assert.equal(second.slug, 'smoke-test-pot-2');
  assert.equal(second.hasVariants, true);
  assert.equal(second.basePrice, 300, 'basePrice follows the lowest variant price');
  expect(await admin.post('/api/products', { name: 'Clash', slug: 'smoke-test-pot', category, basePrice: 1 }), 409);

  assert.equal(expect(await guest.get('/api/products'), 200).total, 46);
  assert.equal(expect(await guest.get('/api/products/smoke-test-pot-2'), 200).related.length, 4);

  // update: price, variants (ids preserved), availability
  const keep = second.variants.find((variant) => variant.size === 'Small');
  const updated = expect(await admin.put(`/api/products/${second._id}`, { name: 'Smoke Test Pot Deluxe', variants: [{ _id: keep._id, size: 'Small', price: 280, stock: 4 }, { size: 'XL', price: 600, stock: 1 }] }), 200).product;
  assert.equal(updated.name, 'Smoke Test Pot Deluxe');
  assert.equal(updated.slug, 'smoke-test-pot-2', 'slug stays stable on rename');
  assert.equal(updated.basePrice, 280);
  assert.equal(updated.variants.find((variant) => variant.size === 'Small')._id, keep._id);
  assert.equal(updated.variants.length, 2);

  expectFieldErrors(await admin.put(`/api/products/${first._id}`, { stock: -1 }), ['stock']);
  const hidden = expect(await admin.put(`/api/products/${first._id}`, { isAvailable: false, basePrice: 135.5 }), 200).product;
  assert.equal(hidden.isAvailable, false);
  assert.equal(hidden.inStock, false);
  assert.equal(hidden.basePrice, 135.5);
  assert.equal(expect(await guest.get('/api/products'), 200).total, 45, 'unavailable products are hidden from the shop');
  expect(await guest.post('/api/orders', orderBody(customerOf('Guest Buyer', 'guest@example.com'), [{ productId: first._id, quantity: 1 }])), 422);

  // admin listing includes unavailable products, default limit 100
  const adminList = expect(await admin.get('/api/admin/products'), 200);
  assert.equal(adminList.total, 46);
  assert.equal(adminList.limit, 100);
  assert.ok(adminList.items.some((item) => item._id === first._id && item.isAvailable === false));
  assert.equal(expect(await admin.get('/api/admin/products?search=smoke'), 200).total, 2);

  // delete
  await alice.post('/api/wishlist', { productId: second._id });
  expect(await admin.delete(`/api/products/${first._id}`), 200);
  expect(await admin.delete(`/api/products/${second._id}`), 200);
  expect(await admin.delete(`/api/products/${second._id}`), 404);
  expect(await guest.get('/api/products/smoke-test-pot'), 404);
  assert.equal(expect(await guest.get('/api/products'), 200).total, 44);
  assert.ok(!expect(await alice.get('/api/wishlist'), 200).items.some((item) => item._id === second._id));
});

await test('category CRUD; delete is blocked while products exist', async () => {
  expectFieldErrors(await admin.post('/api/categories', { name: 'Bad Theme', theme: 'neon' }), ['theme']);
  const { category } = expect(await admin.post('/api/categories', { name: 'Smoke Hampers', description: 'Temporary', theme: 'mint', sortOrder: 9 }), 201);
  assert.equal(category.slug, 'smoke-hampers');
  assert.equal(category.theme, 'mint');
  expect(await admin.post('/api/categories', { name: 'smoke hampers' }), 409);

  const listed = expect(await guest.get('/api/categories'), 200).items;
  assert.equal(listed.length, 7);
  assert.equal(listed.at(-1).slug, 'smoke-hampers');
  assert.equal(listed.at(-1).productCount, 0);

  const updated = expect(await admin.put(`/api/categories/${category._id}`, { theme: 'peach', isActive: false }), 200).category;
  assert.equal(updated.theme, 'peach');
  assert.equal(updated.slug, 'smoke-hampers');
  assert.equal(expect(await guest.get('/api/categories'), 200).items.length, 6, 'inactive categories are hidden from the shop');
  assert.equal(expect(await admin.get('/api/categories'), 200).items.length, 7, 'admins still see them');

  expect(await admin.delete(`/api/categories/${ctx.categories['little-charms']._id}`), 409);
  assert.equal(expect(await guest.get('/api/products?category=little-charms'), 200).total, 12);

  expect(await admin.delete(`/api/categories/${category._id}`), 200);
  expect(await admin.delete(`/api/categories/${category._id}`), 404);
});

await test('image upload: jpeg/png/webp only, served with a cross-origin resource policy', async () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  const uploaded = [];
  try {
    const form = new FormData();
    form.append('images', new Blob([png], { type: 'image/png' }), '../../evil name.png');
    form.append('images', new Blob([png], { type: 'image/png' }), 'second.png');
    const { files } = expect(await admin.post('/api/uploads', undefined, { form }), 201);
    assert.equal(files.length, 2);
    for (const file of files) {
      assert.match(file.url, /^\/uploads\/[a-f0-9]{32}\.png$/, 'stored under a random name');
      uploaded.push(path.join(UPLOADS_DIR, path.basename(file.url)));
    }

    const served = await guest.get(files[0].url);
    assert.equal(served.status, 200);
    assert.equal(served.headers.get('cross-origin-resource-policy'), 'cross-origin');
    assert.equal(served.headers.get('content-type'), 'image/png');

    const textFile = new FormData();
    textFile.append('images', new Blob(['hello'], { type: 'text/plain' }), 'notes.txt');
    expect(await admin.post('/api/uploads', undefined, { form: textFile }), 400);

    const disguised = new FormData();
    disguised.append('images', new Blob(['<script>alert(1)</script>'], { type: 'image/png' }), 'fake.png');
    expect(await admin.post('/api/uploads', undefined, { form: disguised }), 400);

    const tooMany = new FormData();
    for (let i = 0; i < 7; i += 1) tooMany.append('images', new Blob([png], { type: 'image/png' }), `${i}.png`);
    expect(await admin.post('/api/uploads', undefined, { form: tooMany }), 400);

    const wrongField = new FormData();
    wrongField.append('photo', new Blob([png], { type: 'image/png' }), 'a.png');
    expect(await admin.post('/api/uploads', undefined, { form: wrongField }), 400);

    expect(await admin.post('/api/uploads', {}), 400);
  } finally {
    await Promise.all(uploaded.map((file) => fs.unlink(file).catch(() => {})));
  }
  const leftovers = (await fs.readdir(UPLOADS_DIR)).filter((name) => name !== '.gitkeep');
  assert.deepEqual(leftovers, [], 'rejected uploads must not leave files behind');
});

// ---------------------------------------------------------------------------
section('Consistency');
// ---------------------------------------------------------------------------

await test('concurrent orders can never oversell', async () => {
  // 20 in stock, three simultaneous orders of 10: exactly two may succeed.
  const body = () => orderBody(customerOf('Guest Buyer', 'guest@example.com'), [{ productId: ctx.honeyPot._id, quantity: 10 }]);
  const responses = await Promise.all([guest.post('/api/orders', body()), guest.post('/api/orders', body()), guest.post('/api/orders', body())]);
  const statuses = responses.map((response) => response.status).sort();
  assert.deepEqual(statuses, [201, 201, 422]);

  const product = await productBySlug('honey-pot');
  assert.equal(product.stock, 0);
  assert.equal(product.inStock, false);
  assert.equal(expect(await guest.get('/api/products?available=true'), 200).total, 43, 'sold-out products drop out of available=true');
  assert.equal(expect(await guest.get('/api/products'), 200).total, 44);

  const numbers = responses.filter((response) => response.status === 201).map((response) => response.data.order.orderNumber);
  assert.notEqual(numbers[0], numbers[1]);
});

await test('cart reflects live stock: sold-out line is flagged and excluded from the subtotal', async () => {
  await bob.delete('/api/cart');
  expect(await bob.post('/api/cart', { productId: ctx.honeyPot._id, quantity: 1 }), 422);
  expect(await bob.post('/api/cart', { productId: ctx.redRose._id, quantity: 2 }), 200);
  // Sell out Red Rose behind the cart's back.
  await Product.updateOne({ _id: ctx.redRose._id }, { $set: { stock: 1 } });
  let cart = expect(await bob.get('/api/cart'), 200);
  assert.equal(cart.items[0].available, false);
  assert.equal(cart.items[0].maxQuantity, 1);
  assert.equal(cart.subtotal, 0);
  assert.equal(cart.itemCount, 2);
  cart = expect(await bob.put(`/api/cart/${cart.items[0]._id}`, { quantity: 1 }), 200);
  assert.equal(cart.items[0].available, true);
  assert.equal(cart.subtotal, 50);
  await Product.updateOne({ _id: ctx.redRose._id }, { $set: { stock: 20 } });
});

await test('re-seeding is idempotent and never overwrites admin edits', async () => {
  expect(await admin.put(`/api/products/${ctx.sunnySmile._id}`, { basePrice: 75, description: 'Edited by admin' }), 200);
  const again = await seedCatalogue();
  assert.equal(again.productsAdded, 0);
  assert.equal(again.categoriesAdded, 0);
  assert.equal(again.productsTotal, 44);
  assert.equal(again.categoriesTotal, 6);
  const product = await productBySlug('sunny-smile-keychain');
  assert.equal(product.basePrice, 75);
  assert.equal(product.description, 'Edited by admin');

  const reset = await seedCatalogue({ reset: true });
  assert.equal(reset.productsAdded, 44);
  assert.equal(reset.categoriesAdded, 6);
  assert.equal((await productBySlug('sunny-smile-keychain')).basePrice, 50);
});

// ---------------------------------------------------------------------------
section('Standalone MongoDB (no replica set): transaction fallback');
// ---------------------------------------------------------------------------

let standalone;
await test('orders still work, and roll back by hand, when transactions are unavailable', async () => {
  await disconnectDB();
  standalone = await MongoMemoryServer.create();
  await connectDB(standalone.getUri('little-gifts-story'));
  await seedCatalogue();

  const rose = await productBySlug('red-rose-keychain');
  const smile = await productBySlug('sunny-smile-keychain');

  const { order } = expect(await guest.post('/api/orders', orderBody(customerOf('Guest Buyer', 'guest@example.com'), [{ productId: rose._id, quantity: 3 }])), 201);
  assert.equal(order.total, 150 + DELIVERY_CHARGE);
  assert.equal(order.paymentStatus, 'pending');
  assert.equal((await productBySlug('red-rose-keychain')).stock, 17);

  // Second line fails after the first one already took stock: it must be returned.
  await Product.updateOne({ _id: smile._id }, { $set: { isAvailable: true, stock: 2 } });
  const failing = orderBody(customerOf('Guest Buyer', 'guest@example.com'), [
    { productId: rose._id, quantity: 2 },
    { productId: smile._id, quantity: 5 },
  ]);
  expect(await guest.post('/api/orders', failing), 422);
  assert.equal((await productBySlug('red-rose-keychain')).stock, 17);

  // Cancelling restores stock without a transaction too.
  const created = await User.create({ name: 'Standalone Admin', email: adminEmail, passwordHash: await bcrypt.hash(adminPassword, BCRYPT_COST), role: 'admin' });
  assert.ok(created);
  const standaloneAdmin = new Client();
  expect(await standaloneAdmin.post('/api/auth/login', { email: adminEmail, password: adminPassword }), 200);
  expect(await standaloneAdmin.patch(`/api/admin/orders/${order._id}/status`, { status: 'cancelled' }), 200);
  assert.equal((await productBySlug('red-rose-keychain')).stock, 20);
});

// ---------------------------------------------------------------------------
// Teardown and summary
// ---------------------------------------------------------------------------
server.close();
server.closeAllConnections?.();
await disconnectDB().catch(() => {});
await standalone?.stop().catch(() => {});
await memoryDb.stop().catch(() => {});

console.log('\n------------------------------------------------------------------');
if (failures.length > 0) {
  console.log(`SMOKE TEST FAILED: ${failures.length} failed, ${passed} passed`);
  for (const failure of failures) console.log(`  - ${failure.name}`);
  process.exit(1);
}
console.log(`SMOKE TEST PASSED: ${passed} checks, 0 failures`);
process.exit(0);
