/** Entry point for `npm run dev` and `npm start`: real database from MONGODB_URI. */
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { listen, shutdownOnSignal } from './utils/httpServer.js';

async function main() {
  try {
    await connectDB();
  } catch (error) {
    console.error('\nCould not connect to MongoDB.');
    console.error('Check MONGODB_URI in backend/.env and that the database is running and reachable.');
    console.error(`Reason: ${error.message}\n`);
    process.exit(1);
  }

  const server = await listen(createApp(), env.port);
  console.log(`Little Gifts Story API listening on http://localhost:${env.port} (${env.nodeEnv})`);
  shutdownOnSignal(server);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
