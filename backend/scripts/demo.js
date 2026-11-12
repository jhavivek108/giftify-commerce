/**
 * npm run dev:demo
 *
 * Runs the API against a temporary in-memory MongoDB replica set, seeded with
 * the catalogue. No database or secrets are needed and nothing is written to
 * disk: every order, account and edit disappears when the process stops.
 */
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { startMemoryDb } from './lib/memoryDb.js';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Read backend/.env first so PORT, FRONTEND_URL, ADMIN_* etc. are honoured.
dotenv.config({ path: path.join(backendDir, '.env'), quiet: true });

console.log('Starting in-memory MongoDB (the first run downloads MongoDB and can take a few minutes)...');
const memoryDb = await startMemoryDb();

// These overrides exist only inside this process.
process.env.MONGODB_URI = memoryDb.uri;
let generatedSecret = false;
if (!process.env.JWT_SECRET?.trim()) {
  process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
  generatedSecret = true;
}

// Import the app only now, so src/config/env.js validates the values set above.
const { env } = await import('../src/config/env.js');
const { connectDB } = await import('../src/config/db.js');
const { createApp } = await import('../src/app.js');
const { listen, shutdownOnSignal } = await import('../src/utils/httpServer.js');
const { seedCatalogue, ensureAdmin, describeAdminResult } = await import('../src/seed/seedData.js');

await connectDB();
const seeded = await seedCatalogue();
const admin = await ensureAdmin();

let server;
try {
  server = await listen(createApp(), env.port);
} catch (error) {
  console.error(error.message);
  await memoryDb.stop();
  process.exit(1);
}
shutdownOnSignal(server, () => memoryDb.stop());

const adminLines =
  admin.status === 'not_configured'
    ? ['Admin: none. Set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env', '       and restart the demo to get an admin login.']
    : describeAdminResult(admin);

console.log(
  [
    '',
    '==================================================================',
    ' Little Gifts Story API - DEMO MODE (in-memory database)',
    '==================================================================',
    ` API:      http://localhost:${env.port}/api`,
    ` Health:   http://localhost:${env.port}/api/health`,
    ` Data:     ${seeded.categoriesTotal} categories, ${seeded.productsTotal} products seeded`,
    ...adminLines.map((line) => ` ${line}`),
    generatedSecret ? ' JWT:      temporary random secret (logins end when the demo stops)' : ' JWT:      using JWT_SECRET from backend/.env',
    '',
    ' !! This is throw-away demo data. Nothing is saved: all orders,',
    ' !! accounts and changes VANISH when you stop this process.',
    ' !! For real use set MONGODB_URI and JWT_SECRET in backend/.env',
    ' !! and run "npm run seed" then "npm run dev".',
    '',
    ' Press Ctrl+C to stop.',
    '==================================================================',
    '',
  ].join('\n'),
);
