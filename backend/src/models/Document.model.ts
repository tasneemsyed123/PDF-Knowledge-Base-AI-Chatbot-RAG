/**
 * models/Document.model.ts
 * --------------------------------------------------------------------------
 * Metadata for an uploaded PDF. The actual vectors live only in FAISS
 * (owned exclusively by python-ai); this record tracks the processing
 * lifecycle so the admin UI can show status without touching the vector DB.
 */
import { Schema, model, Document as MongooseDocument, Types } from 'mongoose';

export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface DocumentRecord extends MongooseDocument {
  _id: Types.ObjectId;
  fileName: string;
  originalName: string;
  filePath: string;
  uploadDate: Date;
  status: DocumentStatus;
  pageCount?: number;
  chunkCount?: number;
  errorMessage?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<DocumentRecord>(
  {
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    filePath: { type: String, required: true },
    uploadDate: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    pageCount: { type: Number },
    chunkCount: { type: Number },
    errorMessage: { type: String, default: null },
  },
  { timestamps: true },
);

documentSchema.index({ originalName: 'text' });

export const DocumentModel = model<DocumentRecord>('Document', documentSchema);
