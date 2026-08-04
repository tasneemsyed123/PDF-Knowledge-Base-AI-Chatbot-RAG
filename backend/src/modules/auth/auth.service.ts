/**
 * modules/auth/auth.service.ts
 * --------------------------------------------------------------------------
 * Admin login only - there is no self-registration in this app (see
 * scripts/seed-admin.ts).
 */
import { AuthRepository } from './auth.repository';
import { comparePassword } from '../../utils/password';
import { signAccessToken } from '../../utils/jwt';
import { UnauthorizedError } from '../../exceptions/AppError';
import type { LoginInput } from './auth.schema';

export interface AuthResult {
  accessToken: string;
  admin: { id: string; name: string; email: string };
}

export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  async login(input: LoginInput): Promise<AuthResult> {
    const admin = await this.authRepository.findByEmail(input.email);
    // Deliberately identical error message for "no such admin" and "wrong
    // password" - never reveal which one it was.
    if (!admin) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const passwordMatches = await comparePassword(input.password, admin.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const accessToken = signAccessToken({ adminId: admin._id.toString(), email: admin.email });
    return {
      accessToken,
      admin: { id: admin._id.toString(), name: admin.name, email: admin.email },
    };
  }
}
