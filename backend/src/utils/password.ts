/**
 * utils/password.ts
 * --------------------------------------------------------------------------
 * Password hashing via bcrypt. Cost factor 12 is a reasonable balance of
 * security vs. login latency as of 2026 hardware.
 */
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
