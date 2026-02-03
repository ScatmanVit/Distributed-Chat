import { Redis } from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();
import { logger } from '../shared/logger.js';

const redisConfig = {
   host: process.env.REDIS_HOST,
   port: Number(process.env.REDIS_PORT),
};

export const pubClient = new Redis(redisConfig);
export const subClient = pubClient.duplicate();

pubClient.on('connect', () => {
   logger.info('Publisher Redis conectado com sucesso.');
});

pubClient.on('error', (err) => {
   logger.error('Erro no publisher Redis', err);
});

subClient.on('connect', () => {
   logger.info('Subscriber Redis conectado com sucesso.');
});

subClient.on('error', (err) => {
   logger.error('Erro no subscriber Redis', err);
});

const rateCountKey = (userId: string) =>
   `rate_limit:msg:count:${userId}`;

const rateBlockKey = (userId: string) =>
   `rate_limit:msg:block:${userId}`;

export interface RedisOperations {
   isRateLimited: (userId: string) => Promise<number | null>;
   incrementRate: (userId: string, windowMs: number) => Promise<number>;
   blockRate: (userId: string, blockMs: number) => Promise<void>;
   resetRate: (userId: string) => Promise<void>;
}

export const redisOperations: RedisOperations = {
   async isRateLimited(userId) {
      const exists = await pubClient.get(rateBlockKey(userId));
      if (!exists) return null;
      return pubClient.pttl(rateBlockKey(userId));
   },

   async incrementRate(userId, windowMs) {
      const key = rateCountKey(userId);
      const count = await pubClient.incr(key);
      if (count === 1) {
         await pubClient.pexpire(key, windowMs);
      }
      return count;
   },

   async blockRate(userId, blockMs) {
      await pubClient.psetex(rateBlockKey(userId), blockMs, '1');
   },

   async resetRate(userId) {
      await pubClient.del(
         rateCountKey(userId),
         rateBlockKey(userId)
      );
   }
};

export const closeRedisConnections = async (): Promise<void> => {
   await pubClient.quit();
   await subClient.quit();
};

