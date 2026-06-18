import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

// Ensure the uploads directory exists before multer tries to write to it.
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Allowed receipt types. The stored extension is derived from this map — NOT
 * from the client-supplied filename — so an attacker can't smuggle an
 * executable extension (e.g. naming an HTML payload "receipt.html") past the
 * MIME check and have it served back as active content.
 */
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

export const receiptMulterOptions: MulterOptions = {
  storage: diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const ext = MIME_TO_EXT[file.mimetype];
      if (!ext) {
        // fileFilter normally rejects first, but never trust an unknown type.
        cb(new BadRequestException('Unsupported receipt type'), '');
        return;
      }
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 }, // 10 MB, single file
  fileFilter: (_req, file, cb) => {
    if (MIME_TO_EXT[file.mimetype]) {
      cb(null, true);
    } else {
      cb(
        new BadRequestException('Receipt must be a JPEG, PNG, WEBP, or PDF'),
        false,
      );
    }
  },
};
