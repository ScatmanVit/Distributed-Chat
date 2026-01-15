import { logger } from './logger.js';
import { RedisOperations } from '../redis/index.js';

interface RateLimitResult {
   allowed: boolean;
   retryAfterMs?: number;
   current?: number;
   limit?: number;
}

interface RateLimitOptions {
   maxRequests?: number;
   windowMs?: number;
   blockMs?: number;
}

export const checkRateLimit = async (
   redisOps: Pick<
      RedisOperations,
      'isRateLimited' | 'incrementRate' | 'blockRate'
   >,
   userId: string,
   options?: RateLimitOptions
): Promise<RateLimitResult> => {
   const maxRequests = options?.maxRequests ?? 20;
   const windowMs = options?.windowMs ?? 10_000;
   const blockMs = options?.blockMs ?? 30_000;

   try {
      const blockedTtl = await redisOps.isRateLimited(userId);
      if (blockedTtl !== null) {
         return {
            allowed: false,
            retryAfterMs: blockedTtl,
            current: maxRequests,
            limit: maxRequests
         };
      }

      const count = await redisOps.incrementRate(userId, windowMs);

      if (count > maxRequests) {
         await redisOps.blockRate(userId, blockMs);

         logger.warn('Rate limit excedido', {
            userId,
            count,
            limit: maxRequests
         });

         return {
            allowed: false,
            retryAfterMs: blockMs,
            current: count,
            limit: maxRequests
         };
      }

      return {
         allowed: true,
         current: count,
         limit: maxRequests
      };
   } catch (error) {
      logger.error('Erro no rate limiter (fail-open)', error as Error);
      return { allowed: true };
   }
};
