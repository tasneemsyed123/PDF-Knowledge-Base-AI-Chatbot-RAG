/**
 * middlewares/upload.middleware.ts
 * --------------------------------------------------------------------------
 * Multer disk storage for PDF uploads. Files land in `env.uploadDir`, a path
 * python-ai also reads from directly (see config/env.ts) - the backend never
 * ships file bytes over Redis, only the saved path.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { env } from '../config/env';
import { ValidationError } from '../exceptions/AppError';

fs.mkdirSync(env.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.uploadDir),
  filename: (_req, file, cb) => {
    const uniqueName = `${crypto.randomUUID()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

function pdfFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) {
  const isPdfMimetype = file.mimetype === 'application/pdf';
  const isPdfExtension = path.extname(file.originalname).toLowerCase() === '.pdf';
  if (!isPdfMimetype || !isPdfExtension) {
    cb(new ValidationError('Only PDF files are allowed'));
    return;
  }
  cb(null, true);
}

export const uploadPdf = multer({
  storage,
  fileFilter: pdfFileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});
