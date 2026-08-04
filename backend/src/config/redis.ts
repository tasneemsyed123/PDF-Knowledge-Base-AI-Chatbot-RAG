/**
 * config/redis.ts
 * --------------------------------------------------------------------------
 * Two Redis connections, deliberately kept separate:
 *  - `redisPublisher` - a normal client used for PUBLISH and any other
 *    regular commands.
 *  - `redisSubscriber` - a dedicated client in subscriber mode. Once a
 *    node-redis client issues SUBSCRIBE/PSUBSCRIBE it can no longer run
 *    other commands on that same connection, so it must not be shared with
 *    the publisher. This one client is reused for BOTH subscription
 *    patterns the app needs:
 *    - dynamic per-request `subscribe(channel, listener)` /
 *      `unsubscribe(channel)` calls (chat streaming correlation)
 *    - one persistent `pSubscribe('document:process:response:*', listener)`
 *      registered once at boot (fire-and-forget document processing)
 */
import { createClient, RedisClientType } from 'redis';
import { env } from './env';
import { logger } from '../utils/logger';

export const redisPublisher: RedisClientType = createClient({ url: env.redisUrl });
export const redisSubscriber: RedisClientType = createClient({ url: env.redisUrl });

export async function connectToRedis(): Promise<void> {
  redisPublisher.on('error', (err) => logger.error('Redis publisher error', { error: err.message }));
  redisSubscriber.on('error', (err) => logger.error('Redis subscriber error', { error: err.message }));

  await redisPublisher.connect();
  await redisSubscriber.connect();
  logger.info('Redis connected (publisher + subscriber)');
}
