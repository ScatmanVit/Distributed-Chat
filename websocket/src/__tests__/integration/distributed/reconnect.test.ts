import { describe, it, expect, beforeEach } from 'vitest';
import { createTestSocket, waitForConnect, disconnectSocket, waitForEvent } from '../helpers/socket.js';
import { insertTestUser, getMessageById, getMessagesBetweenUsers } from '../helpers/db.js';
import { WS_URL_1, WS_URL_2, isDistributedTest } from '../setup.js';

const TEST_USER_1 = '550e8400-e29b-41d4-a716-446655440001';
const TEST_USER_2 = '550e8400-e29b-41d4-a716-446655440002';

(isDistributedTest ? describe : describe.skip)('Reconnection', () => {
  beforeEach(async () => {
    await insertTestUser(TEST_USER_1, 'user1');
    await insertTestUser(TEST_USER_2, 'user2');
  });

  it('should receive messages after reconnection', async () => {
    // First connection - send a message
    let socket1 = createTestSocket({ url: WS_URL_1, userId: TEST_USER_1, autoConnect: false });
    let socket2 = createTestSocket({ url: WS_URL_1, userId: TEST_USER_2, autoConnect: false });

    socket1.connect();
    socket2.connect();

    await waitForConnect(socket1);
    await waitForConnect(socket2);

    // Send a message
    const sendResult: any = await new Promise((resolve, reject) => {
      socket1.emit('send-message', {
        toUserId: TEST_USER_2,
        content: 'Message before disconnect'
      }, (response: any) => {
        resolve(response);
      });
      setTimeout(() => reject(new Error('Timeout')), 5000);
    });

    expect(sendResult.success).toBe(true);

    // Disconnect both
    await disconnectSocket(socket1);
    await disconnectSocket(socket2);

    // Small delay to ensure clean disconnect state
    await new Promise(resolve => setTimeout(resolve, 500));

    // Reconnect - keep socket1 on instance 1, socket2 moves to instance 2
    // This tests cross-instance message delivery after reconnection
    socket1 = createTestSocket({ url: WS_URL_1, userId: TEST_USER_1 });
    socket2 = createTestSocket({ url: WS_URL_2, userId: TEST_USER_2 });

    await waitForConnect(socket1);
    await waitForConnect(socket2);

    // Small delay to ensure sockets are fully subscribed to their rooms
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify previous message is in database
    const messages = await getMessagesBetweenUsers(TEST_USER_1, TEST_USER_2);
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0].content).toBe('Message before disconnect');

    // Send a new message from instance 1 to instance 2
    const newResult: any = await new Promise((resolve, reject) => {
      socket1.emit('send-message', {
        toUserId: TEST_USER_2,
        content: 'Message after reconnect'
      }, (response: any) => {
        resolve(response);
      });
      setTimeout(() => reject(new Error('Timeout')), 5000);
    });

    expect(newResult.success).toBe(true);

    // Verify new message was received
    const messagePromise = waitForEvent(socket2, 'new-message', 5000);
    const receivedMessage = await messagePromise;
    expect(receivedMessage.content).toBe('Message after reconnect');

    await disconnectSocket(socket1);
    await disconnectSocket(socket2);
  });

  it('should maintain message history after reconnection', async () => {
    let socket1 = createTestSocket({ url: WS_URL_1, userId: TEST_USER_1 });
    let socket2 = createTestSocket({ url: WS_URL_1, userId: TEST_USER_2 });

    await waitForConnect(socket1);
    await waitForConnect(socket2);

    // Send multiple messages
    for (let i = 0; i < 3; i++) {
      const result: any = await new Promise((resolve, reject) => {
        socket1.emit('send-message', {
          toUserId: TEST_USER_2,
          content: `Message ${i}`
        }, (response: any) => {
          resolve(response);
        });
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });
      expect(result.success).toBe(true);
    }

    // Disconnect and reconnect
    await disconnectSocket(socket1);
    await disconnectSocket(socket2);

    // Small delay to ensure clean disconnect state
    await new Promise(resolve => setTimeout(resolve, 500));

    socket1 = createTestSocket({ url: WS_URL_2, userId: TEST_USER_1 });
    socket2 = createTestSocket({ url: WS_URL_2, userId: TEST_USER_2 });

    await waitForConnect(socket1);
    await waitForConnect(socket2);

    // Small delay to ensure sockets are fully subscribed to their rooms
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify all messages persisted
    const messages = await getMessagesBetweenUsers(TEST_USER_1, TEST_USER_2);
    expect(messages.length).toBe(3);
    expect(messages[0].content).toBe('Message 0');
    expect(messages[1].content).toBe('Message 1');
    expect(messages[2].content).toBe('Message 2');

    await disconnectSocket(socket1);
    await disconnectSocket(socket2);
  });
});
