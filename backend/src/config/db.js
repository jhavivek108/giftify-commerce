import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);

/**
 * Connects to MongoDB and waits for every registered model's indexes to be
 * built, so unique constraints are in place before the first request.
 * Import the models (src/models/index.js) before calling this.
 */
export async function connectDB(uri = env.mongodbUri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
