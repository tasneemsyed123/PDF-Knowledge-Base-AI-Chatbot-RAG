/**
 * scripts/seed-admin.ts
 * --------------------------------------------------------------------------
 * Creates (or updates the password of) the single admin account from
 * ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME env vars. Run with:
 *   npm run seed-admin
 * There is no public registration endpoint - this script is the only way
 * to provision admin access.
 */
import { connectToDatabase } from '../src/config/db';
import { env } from '../src/config/env';
import { AdminUserModel } from '../src/models/AdminUser.model';
import { hashPassword } from '../src/utils/password';
import mongoose from 'mongoose';

async function main() {
  if (!env.adminEmail || !env.adminPassword) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env before seeding.');
    process.exit(1);
  }

  await connectToDatabase();

  const passwordHash = await hashPassword(env.adminPassword);
  const admin = await AdminUserModel.findOneAndUpdate(
    { email: env.adminEmail },
    { email: env.adminEmail, passwordHash, name: env.adminName },
    { upsert: true, new: true },
  );

  console.log(`Admin ready: ${admin.email} (id: ${admin._id.toString()})`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to seed admin:', err);
  process.exit(1);
});
