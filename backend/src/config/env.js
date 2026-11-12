/**
 * Central configuration. This is the ONLY module that reads process.env.
 * Everything else imports the validated, typed `env` object from here.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Absolute path of the backend folder. */
export const ROOT_DIR = path.resolve(here, '..', '..');

// Existing process variables win over the file, so hosting dashboards
// (and the in-memory demo / smoke scripts) can override .env values.
dotenv.config({ path: path.join(ROOT_DIR, '.env'), quiet: true });

const clean = (value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};
const required = (schema) => z.preprocess(clean, schema);
const optional = (schema) => z.preprocess(clean, schema.optional());

const schema = z.object({
  PORT: optional(z.coerce.number().int().min(1).max(65535)),
  NODE_ENV: optional(z.enum(['development', 'production', 'test'])),
  MONGODB_URI: required(z.string().regex(/^mongodb(\+srv)?:\/\/.+/)),
  JWT_SECRET: required(z.string().min(32)),
  JWT_EXPIRES_IN: optional(z.string().regex(/^\d+\s?(s|m|h|d|w|y)?$/)),
  FRONTEND_URL: optional(z.string()),
  WHATSAPP_NUMBER: optional(z.string().regex(/^\d{8,15}$/)),
  IMAGE_STORAGE_PROVIDER: optional(z.string().toLowerCase()),
  IMAGE_STORAGE_API_KEY: optional(z.string()),
  IMAGE_STORAGE_API_SECRET: optional(z.string()),
  RAZORPAY_KEY_ID: optional(z.string()),
  RAZORPAY_KEY_SECRET: optional(z.string()),
  DELIVERY_CHARGE: optional(z.coerce.number().min(0)),
  FREE_DELIVERY_ABOVE: optional(z.coerce.number().min(0)),
  ADMIN_NAME: optional(z.string()),
  ADMIN_EMAIL: optional(z.string()),
  ADMIN_PASSWORD: optional(z.string()),
  TRUST_PROXY: optional(z.string()),
});

/** Plain-language help shown when a variable is missing or wrong. */
const HELP = {
  PORT: ['Port the API listens on, a number such as 5000.'],
  NODE_ENV: ['One of: development, production, test.'],
  MONGODB_URI: [
    'Your MongoDB connection string. It must start with mongodb:// or mongodb+srv://',
    'Atlas example: mongodb+srv://<user>:<password>@<cluster>/<database>',
    'Local example: mongodb://127.0.0.1:27017/little-gifts-story',
  ],
  JWT_SECRET: [
    'A long random string (at least 32 characters) used to sign login tokens.',
    'Generate one with:',
    `  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`,
  ],
  JWT_EXPIRES_IN: ['How long a login lasts, e.g. 7d, 12h or 3600 (seconds).'],
  WHATSAPP_NUMBER: ['Digits only, with country code and no + sign, e.g. 91XXXXXXXXXX.'],
  DELIVERY_CHARGE: ['A number of rupees, 0 or more.'],
  FREE_DELIVERY_ABOVE: ['A number of rupees, 0 or more (0 switches free delivery off).'],
};

function failWithFriendlyError(issues) {
  const names = [...new Set(issues.map((issue) => String(issue.path[0])))];
  const lines = [
    '',
    '==================================================================',
    ' Little Gifts Story API - configuration problem',
    '==================================================================',
    ' The server cannot start because some settings are missing or',
    ' invalid. Open backend/.env and fix the following:',
    '',
  ];
  for (const name of names) {
    const current = process.env[name];
    const state = current === undefined || current.trim() === '' ? 'is missing' : 'is not valid';
    lines.push(`  * ${name} ${state}.`);
    for (const help of HELP[name] ?? []) lines.push(`      ${help}`);
    lines.push('');
  }
  lines.push(
    ' Every setting is described in backend/.env.example.',
    ' No database yet? Run "npm run dev:demo" to try the API with a',
    ' temporary in-memory database.',
    '==================================================================',
    '',
  );
  console.error(lines.join('\n'));
  process.exit(1);
}

const parsed = schema.safeParse(process.env);
if (!parsed.success) failWithFriendlyError(parsed.error.issues);
const raw = parsed.data;

function parseTrustProxy(value) {
  if (value === undefined || value === 'false') return false;
  if (value === 'true') return true;
  return /^\d+$/.test(value) ? Number(value) : value;
}

const nodeEnv = raw.NODE_ENV ?? 'development';

export const env = Object.freeze({
  nodeEnv,
  isProd: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: raw.PORT ?? 5000,
  mongodbUri: raw.MONGODB_URI,
  jwtSecret: raw.JWT_SECRET,
  jwtExpiresIn: raw.JWT_EXPIRES_IN ?? '7d',
  frontendUrls: (raw.FRONTEND_URL ?? 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim().replace(/\/+$/, ''))
    .filter(Boolean),
  whatsappNumber: raw.WHATSAPP_NUMBER ?? '',
  imageStorage: Object.freeze({
    provider: raw.IMAGE_STORAGE_PROVIDER ?? 'local',
    apiKey: raw.IMAGE_STORAGE_API_KEY,
    apiSecret: raw.IMAGE_STORAGE_API_SECRET,
  }),
  razorpay: Object.freeze({
    keyId: raw.RAZORPAY_KEY_ID,
    keySecret: raw.RAZORPAY_KEY_SECRET,
    enabled: Boolean(raw.RAZORPAY_KEY_ID && raw.RAZORPAY_KEY_SECRET),
  }),
  deliveryCharge: raw.DELIVERY_CHARGE ?? 0,
  freeDeliveryAbove: raw.FREE_DELIVERY_ABOVE ?? 0,
  admin: Object.freeze({
    name: raw.ADMIN_NAME,
    email: raw.ADMIN_EMAIL,
    password: raw.ADMIN_PASSWORD,
  }),
  trustProxy: parseTrustProxy(raw.TRUST_PROXY),
});
