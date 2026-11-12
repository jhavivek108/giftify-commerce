import { z } from 'zod';
import { email, indianPhone, optionalField } from './common.js';

// Unknown keys (including "role") are stripped: registration can only ever
// create a customer.
export const registerBody = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password can be at most 72 characters'), // bcrypt ignores anything beyond 72 bytes
  phone: optionalField(indianPhone),
});

export const loginBody = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(200),
});
