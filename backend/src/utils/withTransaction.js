import mongoose from 'mongoose';

let transactionsSupported = true;

function isStandaloneError(error) {
  return (
    error?.code === 20 ||
    /Transaction numbers are only allowed on a replica set member or mongos/i.test(error?.message ?? '')
  );
}

/**
 * Runs `fn(session)` inside a MongoDB transaction and returns its result.
 *
 * Transactions need a replica set (MongoDB Atlas always is one). On a plain
 * standalone mongod the first operation fails with code 20; in that case we
 * remember it and run `fn(null)` without a transaction, so local development
 * against a standalone server still works.
 *
 * Rules for `fn`:
 *  - pass the session to every query/write (see `sessionOptions`),
 *  - it may be called more than once (MongoDB retries transient conflicts),
 *    so build all state inside it,
 *  - when `session` is null it must undo its own partial writes on failure.
 */
export async function withTransaction(fn) {
  if (!transactionsSupported) return fn(null);

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } catch (error) {
    if (!isStandaloneError(error)) throw error;
    transactionsSupported = false;
    return fn(null);
  } finally {
    await session.endSession();
  }
}

/** Query/write options for an optional session. */
export const sessionOptions = (session) => (session ? { session } : {});
