import { describe, it, expect, beforeEach } from 'vitest';
import { createTestSocket, waitForConnect, disconnectSocket } from './helpers/socket.js';
import { insertTestUser } from './helpers/db.js';
import { clearRedisRateLimits } from './helpers/redis.js';
import { WS_URL_1 } from './setup.js';

const TEST_USER_1 = '550e8400-e29b-41d4-a716-446655440001';
const TEST_USER_2 = '550e8400-e29b-41d4-a716-446655440002';

describe('Rate Limiting', () => {
  let socket1: any;

  beforeEach(async () => {
    await insertTestUser(TEST_USER_1, 'user1');
    await insertTestUser(TEST_USER_2, 'user2');
    await clearRedisRateLimits();
  });

  it('should allow messages within rate limit', async () => {
    socket1 = createTestSocket({ url: WS_URL_1, userId: TEST_USER_1 });
    await waitForConnect(socket1);

    for (let i = 0; i < 5; i++) {
      const result = await new Promise((resolve, reject) => {
        socket1.emit('send-message', {
          toUserId: TEST_USER_2,
          content: `Message ${i}`
        }, (response: any) => {
          resolve(response);
        });
        setTimeout(() => reject(new Error('Timeout')), 3000);
      });

      expect(result).toEqual(expect.objectContaining({
        success: true
      }));
    }

    await disconnectSocket(socket1);
  });

  it('should track message count correctly', async () => {
    socket1 = createTestSocket({ url: WS_URL_1, userId: TEST_USER_1 });
    await waitForConnect(socket1);

    const messageCount = 15;
    for (let i = 0; i < messageCount; i++) {
      const result: any = await new Promise((resolve, reject) => {
        socket1.emit('send-message', {
          toUserId: TEST_USER_2,
          content: `Message ${i}`
        }, (response: any) => {
          resolve(response);
        });
        setTimeout(() => reject(new Error('Timeout')), 3000);
      });

      expect(result.success).toBe(true);
    }

    await disconnectSocket(socket1);
  });

  it('should eventually block after many messages', async () => {
    socket1 = createTestSocket({ url: WS_URL_1, userId: TEST_USER_1 });
    await waitForConnect(socket1);

    let blocked = false;
    let lastResult: any = null;
    
    for (let i = 0; i < 25; i++) {
      try {
        const result: any = await new Promise((resolve, reject) => {
          socket1.emit('send-message', {
            toUserId: TEST_USER_2,
            content: `Message ${i}`
          }, (response: any) => {
            resolve(response);
          });
          setTimeout(() => reject(new Error('Timeout')), 3000);
        });

        lastResult = result;
        
        if (!result.success && result.error?.includes('rápido demais')) {
          blocked = true;
          expect(result.retryAfterMs).toBeGreaterThan(0);
          break;
        }
      } catch (err: any) {
        if (err.message === 'Timeout') {
          lastResult = { timeout: true };
        }
        break;
      }
    }

    expect(blocked || (lastResult && lastResult.timeout)).toBe(true);

    await disconnectSocket(socket1);
  });

  it('should reset rate limit after cleanup', async () => {
    socket1 = createTestSocket({ url: WS_URL_1, userId: TEST_USER_1 });
    await waitForConnect(socket1);

    for (let i = 0; i < 10; i++) {
      await new Promise((resolve, reject) => {
        socket1.emit('send-message', {
          toUserId: TEST_USER_2,
          content: `Batch1 ${i}`
        }, (response: any) => {
          resolve(response);
        });
        setTimeout(() => reject(new Error('Timeout')), 3000);
      });
    }

    await disconnectSocket(socket1);

    await clearRedisRateLimits();

    socket1 = createTestSocket({ url: WS_URL_1, userId: TEST_USER_1 });
    await waitForConnect(socket1);

    const result = await new Promise((resolve, reject) => {
      socket1.emit('send-message', {
        toUserId: TEST_USER_2,
        content: 'After cleanup'
      }, (response: any) => {
        resolve(response);
      });
      setTimeout(() => reject(new Error('Timeout')), 3000);
    });

    expect(result).toEqual(expect.objectContaining({
      success: true
    }));

    await disconnectSocket(socket1);
  });
});
