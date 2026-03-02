import Redis from 'ioredis';

export const createTestRedisClient = () => {
  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
  });
};

export const testRedis = createTestRedisClient();

export async function clearRedisRateLimits() {
  const keys = await testRedis.keys('rate_limit:*');
  if (keys.length > 0) {
    await testRedis.del(...keys);
  }
}

export async function closeTestRedis() {
  await testRedis.quit();
}
