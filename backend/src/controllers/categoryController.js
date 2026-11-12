import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { created, ok } from '../utils/response.js';
import { definedOnly, uniqueSlug } from '../utils/text.js';

/**
 * Public: active categories with the number of available products.
 * Admin: every category, counting all of its products.
 */
export async function listCategories(req, res) {
  const isAdmin = req.user?.role === 'admin';

  const [categories, counts] = await Promise.all([
    Category.find(isAdmin ? {} : { isActive: true }).sort({ sortOrder: 1, name: 1 }),
    Product.aggregate([
      { $match: isAdmin ? {} : { isAvailable: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
  ]);
  const countById = new Map(counts.map((row) => [String(row._id), row.count]));

  const items = categories.map((category) => ({
    ...category.toJSON(),
    productCount: countById.get(String(category._id)) ?? 0,
  }));
  ok(res, { items });
}

async function assertNameFree(name, excludeId) {
  const clash = await Category.findOne({ name, _id: { $ne: excludeId } })
    .collation({ locale: 'en', strength: 2 })
    .select('_id');
  if (clash) {
    throw ApiError.conflict('A category with this name already exists', [
      { path: 'name', message: 'A category with this name already exists' },
    ]);
  }
}

async function assertSlugFree(slug, excludeId) {
  if (await Category.exists({ slug, _id: { $ne: excludeId } })) {
    throw ApiError.conflict('A category with this slug already exists', [
      { path: 'slug', message: 'This slug is already in use' },
    ]);
  }
}

export async function createCategory(req, res) {
  const body = definedOnly(req.valid.body);
  await assertNameFree(body.name);
  if (body.slug) await assertSlugFree(body.slug);

  const category = await Category.create({
    ...body,
    slug: body.slug ?? (await uniqueSlug(Category, body.name)),
  });
  created(res, { category }, 'Category created');
}

export async function updateCategory(req, res) {
  const body = definedOnly(req.valid.body);
  const category = await Category.findById(req.valid.params.id);
  if (!category) throw ApiError.notFound('Category not found');

  if (body.name !== undefined && body.name !== category.name) await assertNameFree(body.name, category._id);
  if (body.slug && body.slug !== category.slug) await assertSlugFree(body.slug, category._id);

  // The slug only changes when one is sent explicitly, so existing links keep working after a rename.
  category.set(body);
  await category.save();
  ok(res, { category }, 'Category updated');
}

export async function deleteCategory(req, res) {
  const { id } = req.valid.params;
  const category = await Category.findById(id);
  if (!category) throw ApiError.notFound('Category not found');

  const productCount = await Product.countDocuments({ category: id });
  if (productCount > 0) {
    throw ApiError.conflict(
      `This category still has ${productCount} product${productCount === 1 ? '' : 's'}. Move or delete them first.`,
    );
  }

  await category.deleteOne();
  ok(res, { _id: id }, 'Category deleted');
}
