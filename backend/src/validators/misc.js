import { z } from 'zod';
import { CONTACT_TYPES } from '../utils/constants.js';
import { email, limitQuery, optionalField, pageQuery, queryBoolean, searchQuery } from './common.js';

export const newsletterBody = z.object({ email });

export const contactBody = z.object({
  type: z.enum(CONTACT_TYPES, { error: `Type must be one of: ${CONTACT_TYPES.join(', ')}` }),
  name: z.string().trim().min(2, 'Enter your name').max(80),
  email,
  // Business enquiries can come from abroad, so this is looser than the checkout phone.
  phone: optionalField(z.string().trim().regex(/^\+?[\d\s\-()]{7,20}$/, 'Enter a valid phone number')),
  company: optionalField(z.string().trim().max(120)),
  subject: optionalField(z.string().trim().max(150)),
  message: z
    .string()
    .trim()
    .min(10, 'Message must be at least 10 characters')
    .max(2000, 'Message can be at most 2000 characters'),
});

export const customerListQuery = z.object({
  search: searchQuery,
  page: pageQuery,
  limit: limitQuery(20),
});

export const messageListQuery = z.object({
  type: z.enum(CONTACT_TYPES).optional(),
  unread: queryBoolean,
  page: pageQuery,
  limit: limitQuery(20),
});

export const emptyQuery = z.object({});
