import { z } from 'zod';
import { CATEGORY_THEMES } from '../utils/constants.js';
import { optionalField } from './common.js';

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes only')
  .max(80);

const fields = {
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  slug: optionalField(slug),
  description: z.string().trim().max(500).optional(),
  image: z.string().trim().max(500).optional(),
  theme: z.enum(CATEGORY_THEMES, { error: `Theme must be one of: ${CATEGORY_THEMES.join(', ')}` }).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
};

export const createCategoryBody = z.object(fields);
export const updateCategoryBody = z.object({ ...fields, name: fields.name.optional() });
