import { Cart } from '../models/Cart.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { Review } from '../models/Review.js';
import { Wishlist } from '../models/Wishlist.js';
import { CATEGORY_FIELDS, listProducts } from '../services/productService.js';
import { ApiError } from '../utils/ApiError.js';
import { created, ok } from '../utils/response.js';
import { definedOnly, uniqueSlug } from '../utils/text.js';

export async function getProducts(req, res) {
  ok(res, await listProducts(req.valid.query));
}

/** Admin listing: same filters, but includes unavailable products and inactive categories. */
export async function getAdminProducts(req, res) {
  ok(res, await listProducts(req.valid.query, { admin: true }));
}

export async function getProductBySlug(req, res) {
  const product = await Product.findOne({ slug: req.valid.params.slug }).populate('category', `${CATEGORY_FIELDS} isActive`);
  const isAdmin = req.user?.role === 'admin';
  // Products in a hidden category are hidden too. A product that is merely
  // marked unavailable still has a page (isAvailable/inStock are false).
  if (!product || !product.category || (!product.category.isActive && !isAdmin)) {
    throw ApiError.notFound('Product not found');
  }

  const related = await Product.find({
    category: product.category._id,
    _id: { $ne: product._id },
    isAvailable: true,
  })
    .sort({ isFeatured: -1, sortOrder: 1 })
    .limit(4)
    .populate('category', CATEGORY_FIELDS);

  const json = product.toJSON();
  delete json.category.isActive;
  ok(res, { product: json, related });
}

async function assertCategoryExists(categoryId) {
  if (!(await Category.exists({ _id: categoryId }))) {
    throw ApiError.badRequest('Please check the highlighted fields and try again.', [
      { path: 'category', message: 'Category not found' },
    ]);
  }
}

/** Drops undefined keys; new variants (no _id) get a fresh id from Mongoose. */
function cleanBody(body) {
  const clean = definedOnly(body);
  if (clean.variants) clean.variants = clean.variants.map(definedOnly);
  if (clean.colours) clean.colours = clean.colours.map(definedOnly);
  if (clean.images) clean.images = clean.images.map(definedOnly);
  return clean;
}

async function assertSlugFree(slug, excludeId) {
  if (await Product.exists({ slug, _id: { $ne: excludeId } })) {
    throw ApiError.conflict('A product with this slug already exists', [
      { path: 'slug', message: 'This slug is already in use' },
    ]);
  }
}

export async function createProduct(req, res) {
  const body = cleanBody(req.valid.body);
  await assertCategoryExists(body.category);
  if (body.slug) await assertSlugFree(body.slug);

  const product = await Product.create({
    ...body,
    // Auto-generated slugs are de-duplicated: red-rose, red-rose-2, ...
    slug: body.slug ?? (await uniqueSlug(Product, body.name)),
  });
  await product.populate('category', CATEGORY_FIELDS);
  created(res, { product }, 'Product created');
}

export async function updateProduct(req, res) {
  const body = cleanBody(req.valid.body);
  const product = await Product.findById(req.valid.params.id);
  if (!product) throw ApiError.notFound('Product not found');

  if (body.category) await assertCategoryExists(body.category);
  if (body.slug && body.slug !== product.slug) await assertSlugFree(body.slug, product._id);

  // Loaded and saved (rather than findByIdAndUpdate) so the model hook that
  // keeps basePrice equal to the lowest variant price runs.
  product.set(body);
  await product.save();
  await product.populate('category', CATEGORY_FIELDS);
  ok(res, { product }, 'Product updated');
}

export async function deleteProduct(req, res) {
  const { id } = req.valid.params;
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound('Product not found');

  await product.deleteOne();
  // Tidy up references. Orders keep their own snapshot of the product.
  await Promise.all([
    Review.deleteMany({ product: product._id }),
    Wishlist.updateMany({ products: product._id }, { $pull: { products: product._id } }),
    Cart.updateMany({ 'items.product': product._id }, { $pull: { items: { product: product._id } } }),
  ]);
  ok(res, { _id: id }, 'Product deleted');
}
