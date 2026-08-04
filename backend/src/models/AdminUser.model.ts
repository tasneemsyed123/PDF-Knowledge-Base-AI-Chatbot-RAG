/**
 * models/AdminUser.model.ts
 * --------------------------------------------------------------------------
 * A single (or handful of) admin account(s), created only via
 * `scripts/seed-admin.ts` - there is no public registration endpoint for
 * this app (Module 1 only calls for "Admin Login").
 */
import { Schema, model, Document, Types } from 'mongoose';

export interface AdminUserDocument extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const adminUserSchema = new Schema<AdminUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
);

export const AdminUserModel = model<AdminUserDocument>('AdminUser', adminUserSchema);
