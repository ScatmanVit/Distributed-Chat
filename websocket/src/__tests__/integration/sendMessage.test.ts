import { describe, it, expect, beforeEach } from 'vitest';
import { createTestSocket, waitForConnect, disconnectSocket, waitForEvent } from './helpers/socket.js';
import { insertTestUser, getMessageById, getMessagesBetweenUsers } from './helpers/db.js';
import { WS_URL_1, WS_URL_2 } from './setup.js';

const TEST_USER_1 = '550e8400-e29b-41d4-a716-446655440001';
const TEST_USER_2 = '550e8400-e29b-41d4-a716-446655440002';

describe('Send Message', () => {
  let socket1: any;
  let socket2: any;

  beforeEach(async () => {
    await insertTestUser(TEST_USER_1, 'user1');
    await insertTestUser(TEST_USER_2, 'user2');
  });

  it('should send message between two users on same instance', async () => {
    socket1 = createTestSocket({ url: WS_URL_1, userId: TEST_USER_1 });
    socket2 = createTestSocket({ url: WS_URL_1, userId: TEST_USER_2 });

    await waitForConnect(socket1);
    await waitForConnect(socket2);

    const messagePromise = waitForEvent(socket2, 'new-message', 5000);

    const result = await new Promise((resolve, reject) => {
      socket1.emit('send-message', {
        toUserId: TEST_USER_2,
        content: 'Hello, world!'
      }, (response: any) => {
        resolve(response);
      });

      setTimeout(() => reject(new Error('Timeout')), 5000);
    });

    const receivedMessage = await messagePromise;

    expect(result).toEqual(expect.objectContaining({
      success: true,
      message: expect.objectContaining({
        senderId: TEST_USER_1,
        receiverId: TEST_USER_2,
        content: 'Hello, world!'
      })
    }));

    expect(receivedMessage).toEqual(expect.objectContaining({
      senderId: TEST_USER_1,
      receiverId: TEST_USER_2,
      content: 'Hello, world!'
    }));

    const dbMessage = await getMessageById(result.message.id);
    expect(dbMessage).toBeDefined();
    expect(dbMessage.content).toBe('Hello, world!');
    expect(dbMessage.sender_id).toBe(TEST_USER_1);

    await disconnectSocket(socket1);
    await disconnectSocket(socket2);
  });

  it('should persist message in database', async () => {
    socket1 = createTestSocket({ url: WS_URL_1, userId: TEST_USER_1 });
    socket2 = createTestSocket({ url: WS_URL_1, userId: TEST_USER_2 });

    await waitForConnect(socket1);
    await waitForConnect(socket2);

    const result = await new Promise((resolve, reject) => {
      socket1.emit('send-message', {
        toUserId: TEST_USER_2,
        content: 'Test message'
      }, (response: any) => {
        resolve(response);
      });

      setTimeout(() => reject(new Error('Timeout')), 5000);
    });

    expect(result.success).toBe(true);

    const messages = await getMessagesBetweenUsers(TEST_USER_1, TEST_USER_2);
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('Test message');
    expect(messages[0].sender_id).toBe(TEST_USER_1);
    expect(messages[0].receiver_id).toBe(TEST_USER_2);

    await disconnectSocket(socket1);
    await disconnectSocket(socket2);
  });

  it('should reject message with invalid toUserId', async () => {
    socket1 = createTestSocket({ url: WS_URL_1, userId: TEST_USER_1 });
    await waitForConnect(socket1);

    const result = await new Promise((resolve, reject) => {
      socket1.emit('send-message', {
        toUserId: 'invalid-id',
        content: 'Test'
      }, (response: any) => {
        resolve(response);
      });

      setTimeout(() => reject(new Error('Timeout')), 5000);
    });

    expect(result).toEqual(expect.objectContaining({
      success: false,
      errors: expect.any(Array)
    }));

    await disconnectSocket(socket1);
  });

  it('should reject message with empty content', async () => {
    socket1 = createTestSocket({ url: WS_URL_1, userId: TEST_USER_1 });
    socket2 = createTestSocket({ url: WS_URL_1, userId: TEST_USER_2 });

    await waitForConnect(socket1);
    await waitForConnect(socket2);

    const result = await new Promise((resolve, reject) => {
      socket1.emit('send-message', {
        toUserId: TEST_USER_2,
        content: ''
      }, (response: any) => {
        resolve(response);
      });

      setTimeout(() => reject(new Error('Timeout')), 5000);
    });

    expect(result).toEqual(expect.objectContaining({
      success: false,
      errors: expect.any(Array)
    }));

    await disconnectSocket(socket1);
    await disconnectSocket(socket2);
  });

  it('should reject message with very long content', async () => {
    socket1 = createTestSocket({ url: WS_URL_1, userId: TEST_USER_1 });
    socket2 = createTestSocket({ url: WS_URL_1, userId: TEST_USER_2 });

    await waitForConnect(socket1);
    await waitForConnect(socket2);

    const longContent = 'a'.repeat(5001);

    const result = await new Promise((resolve, reject) => {
      socket1.emit('send-message', {
        toUserId: TEST_USER_2,
        content: longContent
      }, (response: any) => {
        resolve(response);
      });

      setTimeout(() => reject(new Error('Timeout')), 5000);
    });

    expect(result).toEqual(expect.objectContaining({
      success: false,
      errors: expect.any(Array)
    }));

    await disconnectSocket(socket1);
    await disconnectSocket(socket2);
  });
});
