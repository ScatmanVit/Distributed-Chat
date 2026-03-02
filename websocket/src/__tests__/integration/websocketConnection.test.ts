import { describe, it, expect, beforeEach } from 'vitest';
import { createTestSocket, createTestSocketWithoutAuth, waitForConnect, disconnectSocket } from './helpers/socket.js';
import { generateTestToken, generateExpiredToken, generateInvalidToken } from './helpers/auth.js';
import { insertTestUser } from './helpers/db.js';
import { WS_URL_1 } from './setup.js';

const TEST_USER_1 = '550e8400-e29b-41d4-a716-446655440001';
const TEST_USER_2 = '550e8400-e29b-41d4-a716-446655440002';

describe('WebSocket Connection', () => {
  beforeEach(async () => {
    await insertTestUser(TEST_USER_1, 'user1');
    await insertTestUser(TEST_USER_2, 'user2');
  });

  it('should connect with valid JWT token', async () => {
    const socket = createTestSocket({ url: WS_URL_1, userId: TEST_USER_1 });
    
    await waitForConnect(socket);
    
    expect(socket.connected).toBe(true);
    
    await disconnectSocket(socket);
  });

  it('should reject connection without token', async () => {
    const socket = createTestSocketWithoutAuth(WS_URL_1);
    
    await expect(waitForConnect(socket)).rejects.toThrow();
    
    expect(socket.connected).toBe(false);
    await disconnectSocket(socket);
  });

  it('should reject connection with invalid token', async () => {
    const socket = require('socket.io-client').io(WS_URL_1, {
      auth: { token: generateInvalidToken() },
      transports: ['websocket'],
      reconnection: false,
      timeout: 5000,
    });
    
    await expect(waitForConnect(socket)).rejects.toThrow();
    
    expect(socket.connected).toBe(false);
    await disconnectSocket(socket);
  });

  it('should reject connection with expired token', async () => {
    const socket = require('socket.io-client').io(WS_URL_1, {
      auth: { token: generateExpiredToken(TEST_USER_1) },
      transports: ['websocket'],
      reconnection: false,
      timeout: 5000,
    });
    
    await expect(waitForConnect(socket)).rejects.toThrow();
    
    expect(socket.connected).toBe(false);
    await disconnectSocket(socket);
  });

  it('should reject connection for non-existent user', async () => {
    const nonExistentUserId = '550e8400-e29b-41d4-a716-446655449999';
    const socket = createTestSocket({ url: WS_URL_1, userId: nonExistentUserId });
    
    await expect(waitForConnect(socket)).rejects.toThrow();
    
    expect(socket.connected).toBe(false);
    await disconnectSocket(socket);
  });
});
