/**
 * config/db.ts
 * --------------------------------------------------------------------------
 * Owns the single Mongoose connection for the whole process.
 */
import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

export async function connectToDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri);
  logger.info('MongoDB connected');

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', { error: err.message });
  });
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
}
