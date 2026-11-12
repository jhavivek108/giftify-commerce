import { disconnectDB } from '../config/db.js';

/**
 * Starts the HTTP server on `port` (0 = any free port) and resolves once it
 * is listening. Shared by src/server.js, scripts/demo.js and scripts/smoke.js.
 */
export function listen(app, port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port);
    server.once('listening', () => resolve(server));
    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        reject(new Error(`Port ${port} is already in use. Stop the other program or change PORT in backend/.env.`));
      } else {
        reject(error);
      }
    });
  });
}

/** Closes the server and the database connection on Ctrl+C / platform shutdown. */
export function shutdownOnSignal(server, cleanup = async () => {}) {
  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    console.log('\nShutting down...');
    server.close();
    server.closeAllConnections?.();
    await disconnectDB().catch(() => {});
    await cleanup().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
