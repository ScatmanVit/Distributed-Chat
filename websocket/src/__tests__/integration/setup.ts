import { beforeAll, afterAll, beforeEach } from 'vitest';
import { clearDatabase, closeTestDb } from './helpers/db.js';
import { clearRedisRateLimits, closeTestRedis } from './helpers/redis.js';

const WS_URL_1 = process.env.WS_URL_1 || 'ws://localhost:8080';
const WS_URL_2 = process.env.WS_URL_2 || 'ws://localhost:8081';

const isDistributedTest = WS_URL_1 !== WS_URL_2;

export { WS_URL_1, WS_URL_2, isDistributedTest };

beforeAll(async () => {
  console.log('===== Test Suite Started =====');
  console.log(`WS_URL_1: ${WS_URL_1}`);
  console.log(`WS_URL_2: ${WS_URL_2}`);
  console.log(`Distributed tests enabled: ${isDistributedTest}`);
});

afterAll(async () => {
  await closeTestDb();
  await closeTestRedis();
  console.log('===== Test Suite Finished =====');
});

beforeEach(async () => {
  await clearDatabase();
  await clearRedisRateLimits();
});
