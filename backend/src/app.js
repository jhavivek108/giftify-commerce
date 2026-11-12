import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { globalLimiter } from './middleware/rateLimiters.js';
import { sanitize } from './middleware/sanitize.js';
import { corsOptions, noStore, originCheck } from './middleware/security.js';
import './models/index.js';
import apiRoutes from './routes/index.js';
import { UPLOADS_DIR } from './services/storage/index.js';
import { decimalReplacer } from './utils/money.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  // Needed behind a reverse proxy so rate limiting and secure cookies see the real client.
  app.set('trust proxy', env.trustProxy);
  // Safety net: any Decimal128 that reaches a response is sent as a plain number.
  app.set('json replacer', decimalReplacer);

  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(compression());
  // Logs method, path, status and timing only: never bodies, cookies or headers.
  if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));

  // Uploaded product images. The frontend lives on another origin, so the
  // files must be embeddable cross-origin (helmet's default is same-origin).
  app.use(
    '/uploads',
    (req, res, next) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      next();
    },
    express.static(UPLOADS_DIR, { index: false, dotfiles: 'ignore', maxAge: '7d', fallthrough: true }),
  );

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(sanitize);

  app.use('/api', noStore, originCheck, globalLimiter, apiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
