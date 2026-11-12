import { MongoMemoryReplSet } from 'mongodb-memory-server';

const DB_NAME = 'little-gifts-story';

/**
 * Starts a throw-away, single-node MongoDB replica set that lives in memory.
 * A replica set (rather than a standalone) is used so multi-document
 * transactions behave exactly as they do on MongoDB Atlas.
 * The first run downloads a mongod binary, which can take a few minutes.
 */
export async function startMemoryDb() {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger', dbName: DB_NAME },
  });
  return {
    uri: replSet.getUri(DB_NAME),
    stop: () => replSet.stop(),
  };
}
