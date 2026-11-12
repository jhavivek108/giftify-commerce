/**
 * Seeds the catalogue into the database in MONGODB_URI.
 *
 *   npm run seed              add any missing categories/products (safe to re-run)
 *   npm run seed -- --reset   delete ALL categories and products first, then seed
 *
 * Also creates the admin account when ADMIN_EMAIL and ADMIN_PASSWORD are set.
 */
import { connectDB, disconnectDB } from '../config/db.js';
import '../models/index.js';
import { describeAdminResult, ensureAdmin, seedCatalogue } from './seedData.js';

const reset = process.argv.includes('--reset');

async function main() {
  await connectDB();

  if (reset) console.log('--reset: deleting all categories and products first...');
  const result = await seedCatalogue({ reset });
  console.log(`Categories: ${result.categoriesAdded} added, ${result.categoriesTotal} in database.`);
  console.log(`Products:   ${result.productsAdded} added, ${result.productsTotal} in database.`);
  if (!reset && result.productsAdded === 0 && result.categoriesAdded === 0) {
    console.log('Nothing new to add. Existing items were left untouched.');
  }

  console.log('');
  for (const line of describeAdminResult(await ensureAdmin())) console.log(line);
}

main()
  .then(() => disconnectDB())
  .catch(async (error) => {
    console.error('Seeding failed:', error.message);
    await disconnectDB().catch(() => {});
    process.exitCode = 1;
  });
