import { io, Socket } from 'socket.io-client';
import { generateTestToken } from './auth.js';

export interface TestSocketOptions {
  url: string;
  userId: string;
  autoConnect?: boolean;
}

export function createTestSocket(options: TestSocketOptions): Socket {
  const socket = io(options.url, {
    auth: {
      token: generateTestToken(options.userId),
    },
    transports: ['websocket'],
    reconnection: false,
    timeout: 10000,
    autoConnect: options.autoConnect ?? true,
  });

  return socket;
}

export function createTestSocketWithoutAuth(url: string): Socket {
  return io(url, {
    transports: ['websocket'],
    reconnection: false,
    timeout: 10000,
  });
}

export function waitForEvent(socket: Socket, event: string, timeout: number = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${event}`));
    }, timeout);

    socket.on(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

export function waitForConnect(socket: Socket, timeout: number = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, timeout);

    socket.on('connect', () => {
      clearTimeout(timer);
      resolve();
    });

    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export function waitForDisconnect(socket: Socket, timeout: number = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Disconnect timeout'));
    }, timeout);

    socket.on('disconnect', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

export function disconnectSocket(socket: Socket): Promise<void> {
  return new Promise((resolve) => {
    if (!socket.connected) {
      resolve();
      return;
    }
    socket.on('disconnect', () => resolve());
    socket.disconnect();
  });
}
