import { z } from 'zod';
import { limitQuery, optionalField, pageQuery } from './common.js';

export const createReviewBody = z.object({
  rating: z
    .number({ error: 'Rating must be a number from 1 to 5' })
    .int('Rating must be a whole number')
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5'),
  title: optionalField(z.string().trim().max(120)),
  comment: z.string().trim().min(3, 'Please write a few words').max(1000),
});

export const reviewListQuery = z.object({
  page: pageQuery,
  limit: limitQuery(50),
});

export const recentReviewsQuery = z.object({
  limit: limitQuery(6, 20),
});
