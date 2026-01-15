import { Redis } from 'ioredis';
import { logger } from '../shared/logger.js';
import dotenv from 'dotenv'
dotenv.config()

const redisConfig = {
   host: process.env.REDIS_HOST,
   port: Number(process.env.REDIS_PORT),
};

export const pubClient = new Redis(redisConfig);
export const subClient = pubClient.duplicate();

pubClient.on('connect', () => {
   logger.info('Publisher Redis conectado com sucesso.');
});

pubClient.on('error', (err) => {
   logger.error('Erro no publisher Redis', err);
});

subClient.on('connect', () => {
   logger.info('Subscriber Redis conectado com sucesso.');
});

subClient.on('error', (err) => {
   logger.error('Erro no subscriber Redis', err);
});

export interface RedisOperations {
   setUserOnline: (userId: string, socketId: string) => Promise<void>;
   getUserSocketId: (userId: string) => Promise<string | null>;
   removeUserOnline: (userId: string) => Promise<void>;
   getOnlineUsersCount: () => Promise<number>;
}

export const setUserOnline = async (userId: string, socketId: string): Promise<void> => {
   await pubClient.hset('online_users', userId, socketId);
};

export const getUserSocketId = async (userId: string): Promise<string | null> => {
   return await pubClient.hget('online_users', userId);
};

export const removeUserOnline = async (userId: string): Promise<void> => {
   await pubClient.hdel('online_users', userId);
};

export const getOnlineUsersCount = async (): Promise<number> => {
   return await pubClient.hlen('online_users');
};

export const redisOperations: RedisOperations = {
   setUserOnline,
   getUserSocketId,
   removeUserOnline,
   getOnlineUsersCount
};

export const closeRedisConnections = async (): Promise<void> => {
   logger.info('Fechando conexões Redis...');
   await pubClient.quit();
   await subClient.quit();
};