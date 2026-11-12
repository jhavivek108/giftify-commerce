import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import { ROOT_DIR } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';

export const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_FILES = 6;

const EXTENSIONS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    // Random name + extension derived from the MIME type. The original
    // filename is never used, so it cannot smuggle a path or an extension.
    filename: (req, file, cb) => cb(null, `${crypto.randomBytes(16).toString('hex')}${EXTENSIONS[file.mimetype]}`),
  }),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter: (req, file, cb) => {
    if (EXTENSIONS[file.mimetype]) cb(null, true);
    else cb(ApiError.badRequest('Only JPEG, PNG or WebP images can be uploaded'));
  },
});

/** Checks the real file signature, since the MIME type is supplied by the client. */
async function looksLikeImage(filePath, mimetype) {
  const handle = await fs.open(filePath, 'r');
  try {
    const header = Buffer.alloc(12);
    await handle.read(header, 0, 12, 0);
    if (mimetype === 'image/jpeg') return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    if (mimetype === 'image/png') return header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (mimetype === 'image/webp') return header.toString('latin1', 0, 4) === 'RIFF' && header.toString('latin1', 8, 12) === 'WEBP';
    return false;
  } finally {
    await handle.close();
  }
}

const removeFiles = (files) => Promise.all(files.map((file) => fs.unlink(file.path).catch(() => {})));

export const localStorageProvider = {
  name: 'local',

  /** Express middleware that receives the multipart field "images". */
  receive: upload.array('images', MAX_FILES),

  /** Validates the received files and returns their public URLs. */
  async store(files) {
    const checks = await Promise.all(files.map((file) => looksLikeImage(file.path, file.mimetype)));
    if (checks.includes(false)) {
      await removeFiles(files);
      throw ApiError.badRequest('One of the files is not a valid JPEG, PNG or WebP image');
    }
    return files.map((file) => ({ url: `/uploads/${file.filename}` }));
  },
};
