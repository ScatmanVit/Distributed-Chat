import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRateLimit } from '../../../shared/rate-limiter.js';

describe('Rate Limiter', () => {
   let mockRedisOps: any;

   beforeEach(() => {
      vi.clearAllMocks();
      mockRedisOps = {
         isRateLimited: vi.fn(),
         incrementRate: vi.fn(),
         blockRate: vi.fn()
      };
   });

   describe('checkRateLimit', () => {
      it('deve permitir quando dentro do limite', async () => {
         mockRedisOps.isRateLimited.mockResolvedValue(null);
         mockRedisOps.incrementRate.mockResolvedValue(5);

         const result = await checkRateLimit(mockRedisOps, 'user-1');

         expect(result).toEqual({
            allowed: true,
            current: 5,
            limit: 20
         });
      });

      it('deve bloquear quando limite excedido', async () => {
         mockRedisOps.isRateLimited.mockResolvedValue(null);
         mockRedisOps.incrementRate.mockResolvedValue(25);

         const result = await checkRateLimit(mockRedisOps, 'user-1');

         expect(result).toEqual({
            allowed: false,
            retryAfterMs: 30000,
            current: 25,
            limit: 20
         });
         expect(mockRedisOps.blockRate).toHaveBeenCalledWith('user-1', 30000);
      });

      it('deve bloquear quando usuário já está bloqueado', async () => {
         mockRedisOps.isRateLimited.mockResolvedValue(15000);

         const result = await checkRateLimit(mockRedisOps, 'user-1');

         expect(result).toEqual({
            allowed: false,
            retryAfterMs: 15000,
            current: 20,
            limit: 20
         });
         expect(mockRedisOps.incrementRate).not.toHaveBeenCalled();
      });

      it('deve usar configurações personalizadas', async () => {
         mockRedisOps.isRateLimited.mockResolvedValue(null);
         mockRedisOps.incrementRate.mockResolvedValue(3);

         const result = await checkRateLimit(mockRedisOps, 'user-1', {
            maxRequests: 5,
            windowMs: 5000,
            blockMs: 10000
         });

         expect(result).toEqual({
            allowed: true,
            current: 3,
            limit: 5
         });
      });

      it('deve ser fail-open quando Redis falha', async () => {
         mockRedisOps.isRateLimited.mockRejectedValue(new Error('Redis connection failed'));

         const result = await checkRateLimit(mockRedisOps, 'user-1');

         expect(result).toEqual({ allowed: true });
      });

      it('deve usar valores padrão corretos', async () => {
         mockRedisOps.isRateLimited.mockResolvedValue(null);
         mockRedisOps.incrementRate.mockResolvedValue(1);

         await checkRateLimit(mockRedisOps, 'user-1');

         expect(mockRedisOps.incrementRate).toHaveBeenCalledWith('user-1', 10000);
      });

      it('deve bloquear quando count excede maxRequests', async () => {
         mockRedisOps.isRateLimited.mockResolvedValue(null);
         mockRedisOps.incrementRate.mockResolvedValue(21);

         const result = await checkRateLimit(mockRedisOps, 'user-1');

         expect(result.allowed).toBe(false);
         expect(mockRedisOps.blockRate).toHaveBeenCalled();
      });
   });
});
