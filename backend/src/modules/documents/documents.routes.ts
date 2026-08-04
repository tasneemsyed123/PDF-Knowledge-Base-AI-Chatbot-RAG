/**
 * modules/documents/documents.routes.ts
 * --------------------------------------------------------------------------
 * All routes here require admin authentication.
 */
import { Router } from 'express';
import { documentsController } from './documents.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { validateQuery, validateParams } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';
import { uploadPdf } from '../../middlewares/upload.middleware';
import { listDocumentsQuerySchema, documentIdParamsSchema } from './documents.schema';

export const documentsRouter = Router();

documentsRouter.use(authMiddleware);

documentsRouter.post('/', uploadPdf.single('file'), asyncHandler(documentsController.upload));
documentsRouter.get('/', validateQuery(listDocumentsQuerySchema), asyncHandler(documentsController.list));
documentsRouter.delete('/:id', validateParams(documentIdParamsSchema), asyncHandler(documentsController.remove));
documentsRouter.post(
  '/:id/reprocess',
  validateParams(documentIdParamsSchema),
  asyncHandler(documentsController.reprocess),
);
