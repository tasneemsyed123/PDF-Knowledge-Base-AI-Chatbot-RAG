/**
 * modules/documents/documents.schema.ts
 * --------------------------------------------------------------------------
 * Zod validation for document list/search query params. Upload has no body
 * schema - it's validated by multer's fileFilter (upload.middleware.ts).
 */
import { z } from 'zod';

export const listDocumentsQuerySchema = z.object({
  // Capped well above any realistic filename search - bounds how much work
  // a single regex-matching query can do, on top of the repository already
  // escaping regex metacharacters.
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;

// Validates a Mongo ObjectId shape (24 hex chars) so a malformed id is
// rejected as a clean 400 here, rather than reaching Mongoose and surfacing
// as an unhandled CastError (500).
export const documentIdParamsSchema = z.object({
  id: z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'Invalid document id'),
});
