import { Router } from 'express';
import { createCategory, deleteCategory, listCategories, updateCategory } from '../controllers/categoryController.js';
import { optionalAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createCategoryBody, updateCategoryBody } from '../validators/category.js';
import { idParams } from '../validators/common.js';
import { emptyQuery } from '../validators/misc.js';

const router = Router();

router.get('/', optionalAuth, validate({ query: emptyQuery }), asyncHandler(listCategories));
router.post('/', requireAdmin, validate({ body: createCategoryBody }), asyncHandler(createCategory));
router.put('/:id', requireAdmin, validate({ params: idParams, body: updateCategoryBody }), asyncHandler(updateCategory));
router.delete('/:id', requireAdmin, validate({ params: idParams }), asyncHandler(deleteCategory));

export default router;
