/**
 * Image storage service. The provider is chosen by IMAGE_STORAGE_PROVIDER.
 *
 * Provider interface:
 *   name            string
 *   receive         Express middleware that parses the multipart field "images" into req.files
 *   store(files)    -> Promise<[{ url }]>
 */
import { env } from '../../config/env.js';
import { createCloudStorageProvider } from './cloud.js';
import { localStorageProvider } from './local.js';

export const storage =
  env.imageStorage.provider === 'local' ? localStorageProvider : createCloudStorageProvider(env.imageStorage.provider);

export { UPLOADS_DIR } from './local.js';
