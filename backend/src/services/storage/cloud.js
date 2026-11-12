import { ApiError } from '../../utils/ApiError.js';

/**
 * Cloud image storage - STUB, NOT IMPLEMENTED YET.
 *
 * Selected when IMAGE_STORAGE_PROVIDER is anything other than "local"
 * (for example "cloudinary" or "s3"). Uploads answer 501 until this is built.
 *
 * TODO(cloud-storage): to implement a provider
 *   1. `receive`: use multer.memoryStorage() with the same limits and MIME
 *      filter as services/storage/local.js,
 *   2. `store(files)`: upload each buffer with the provider SDK using
 *      env.imageStorage.apiKey / env.imageStorage.apiSecret and return
 *      [{ url: <absolute https URL> }].
 * Nothing else in the app needs to change.
 */
export function createCloudStorageProvider(name) {
  const notImplemented = () =>
    new ApiError(501, `Image storage provider "${name}" is not implemented yet. Set IMAGE_STORAGE_PROVIDER=local.`);

  return {
    name,
    receive: (req, res, next) => next(notImplemented()),
    async store() {
      throw notImplemented();
    },
  };
}
