import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestSocket, waitForConnect, disconnectSocket, waitForEvent } from '../helpers/socket.js';
import { insertTestUser, getMessageById, getMessagesBetweenUsers } from '../helpers/db.js';
import { WS_URL_1, WS_URL_2, isDistributedTest } from '../setup.js';

const TEST_USER_1 = '550e8400-e29b-41d4-a716-446655440001';
const TEST_USER_2 = '550e8400-e29b-41d4-a716-446655440002';

(isDistributedTest ? describe : describe.skip)('Distributed - Cross Instance Message', () => {
  let socketA: any;
  let socketB: any;

  beforeEach(async () => {
    await insertTestUser(TEST_USER_1, 'user1');
    await insertTestUser(TEST_USER_2, 'user2');
  });

  afterEach(async () => {
    if (socketA?.connected) await disconnectSocket(socketA);
    if (socketB?.connected) await disconnectSocket(socketB);
  });

  it('should send message from instance 1 to instance 2 and persist in database', async () => {
    socketA = createTestSocket({ url: WS_URL_1, userId: TEST_USER_1 });
    socketB = createTestSocket({ url: WS_URL_2, userId: TEST_USER_2 });

    await waitForConnect(socketA);
    await waitForConnect(socketB);

    const messageEventPromise = waitForEvent(socketB, 'new-message', 5000);

    const sendResult: any = await new Promise((resolve, reject) => {
      socketA.emit('send-message', {
        toUserId: TEST_USER_2,
        content: 'Hello from instance 1 to instance 2'
      }, (response: any) => {
        resolve(response);
      });
      setTimeout(() => reject(new Error('Timeout')), 5000);
    });

    expect(sendResult.success).toBe(true);
    expect(sendResult.message.senderId).toBe(TEST_USER_1);
    expect(sendResult.message.receiverId).toBe(TEST_USER_2);
    expect(sendResult.message.content).toBe('Hello from instance 1 to instance 2');

    const receivedMessage = await messageEventPromise;

    expect(receivedMessage).toBeDefined();
    expect(receivedMessage.senderId).toBe(TEST_USER_1);
    expect(receivedMessage.content).toBe('Hello from instance 1 to instance 2');

    const dbMessage = await getMessageById(sendResult.message.id);
    expect(dbMessage).toBeDefined();
    expect(dbMessage.content).toBe('Hello from instance 1 to instance 2');
    expect(dbMessage.sender_id).toBe(TEST_USER_1);
    expect(dbMessage.receiver_id).toBe(TEST_USER_2);
  });
});
