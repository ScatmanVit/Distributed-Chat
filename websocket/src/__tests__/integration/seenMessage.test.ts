import { describe, it, expect, beforeEach } from 'vitest';
import { createTestSocket, waitForConnect, disconnectSocket, waitForEvent } from './helpers/socket.js';
import { insertTestUser, getMessageById } from './helpers/db.js';
import { WS_URL_1, WS_URL_2 } from './setup.js';

const TEST_USER_1 = '550e8400-e29b-41d4-a716-446655440001';
const TEST_USER_2 = '550e8400-e29b-41d4-a716-446655440002';

describe('Seen Message', () => {
  let socket1: any;
  let socket2: any;

  beforeEach(async () => {
    await insertTestUser(TEST_USER_1, 'user1');
    await insertTestUser(TEST_USER_2, 'user2');
  });

  it('should mark message as seen', async () => {
    socket1 = createTestSocket({ url: WS_URL_1, userId: TEST_USER_1 });
    socket2 = createTestSocket({ url: WS_URL_1, userId: TEST_USER_2 });

    await waitForConnect(socket1);
    await waitForConnect(socket2);

    // First, send a message from user1 to user2
    const sendResult = await new Promise((resolve, reject) => {
      socket1.emit('send-message', {
        toUserId: TEST_USER_2,
        content: 'Message to be seen'
      }, (response: any) => {
        resolve(response);
      });
      setTimeout(() => reject(new Error('Timeout')), 5000);
    });

    expect(sendResult.success).toBe(true);
    const messageId = sendResult.message.id;

    // Wait a bit for the message to be processed
    await new Promise(resolve => setTimeout(resolve, 500));

    // Now user2 marks the message as seen
    const seenResult = await new Promise((resolve, reject) => {
      socket2.emit('seen-message', [
        {
          id: messageId,
          toUserId: TEST_USER_1,
          seen: true
        }
      ], (response: any) => {
        resolve(response);
      });
      setTimeout(() => reject(new Error('Timeout')), 5000);
    });

    expect(seenResult).toEqual({ success: true });

    // Verify in database
    const dbMessage = await getMessageById(messageId);
    expect(dbMessage.status).toBe('read');

    await disconnectSocket(socket1);
    await disconnectSocket(socket2);
  });

  it('should emit messages-seen-new to the message author', async () => {
    socket1 = createTestSocket({ url: WS_URL_1, userId: TEST_USER_1 });
    socket2 = createTestSocket({ url: WS_URL_1, userId: TEST_USER_2 });

    await waitForConnect(socket1);
    await waitForConnect(socket2);

    // Send a message
    const sendResult = await new Promise((resolve, reject) => {
      socket1.emit('send-message', {
        toUserId: TEST_USER_2,
        content: 'Test message'
      }, (response: any) => {
        resolve(response);
      });
      setTimeout(() => reject(new Error('Timeout')), 5000);
    });

    const messageId = sendResult.message.id;
    await new Promise(resolve => setTimeout(resolve, 500));

    // Listen for messages-seen-new on the sender's socket
    const seenEventPromise = waitForEvent(socket1, 'messages-seen-new', 5000);

    // Mark as seen
    await new Promise((resolve, reject) => {
      socket2.emit('seen-message', [
        {
          id: messageId,
          toUserId: TEST_USER_1,
          seen: true
        }
      ], (response: any) => {
        resolve(response);
      });
      setTimeout(() => reject(new Error('Timeout')), 5000);
    });

    const seenEvent = await seenEventPromise;

    expect(seenEvent).toBeInstanceOf(Array);
    expect(seenEvent[0].id).toBe(messageId);
    expect(seenEvent[0].status).toBe('read');

    await disconnectSocket(socket1);
    await disconnectSocket(socket2);
  });

  it('should handle empty seen message array', async () => {
    socket1 = createTestSocket({ url: WS_URL_1, userId: TEST_USER_1 });
    await waitForConnect(socket1);

    const result = await new Promise((resolve, reject) => {
      socket1.emit('seen-message', [], (response: any) => {
        resolve(response);
      });
      setTimeout(() => reject(new Error('Timeout')), 5000);
    });

    // Empty array should return validation error
    expect(result).toEqual(expect.objectContaining({
      success: false,
      errors: expect.any(Array)
    }));

    await disconnectSocket(socket1);
  });
});
