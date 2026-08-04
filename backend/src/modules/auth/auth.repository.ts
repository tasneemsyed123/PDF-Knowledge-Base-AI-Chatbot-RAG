/**
 * modules/auth/auth.repository.ts
 * --------------------------------------------------------------------------
 * The ONLY place in the codebase that talks to Mongoose for AdminUser
 * documents.
 */
import { AdminUserModel, AdminUserDocument } from '../../models/AdminUser.model';

export class AuthRepository {
  async findByEmail(email: string): Promise<AdminUserDocument | null> {
    return AdminUserModel.findOne({ email }).select('+passwordHash');
  }
}
