import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import { db } from './db/pool.js';
import {
   pubClient,
   subClient,
   closeRedisConnections,
   redisOperations
} from './redis/index.js';
import { createUserService } from './services/user.js';
import { createMessageService } from './services/message.js';
import { handleRegister, handleDisconnect, createSendMessageHandler } from './handlers/index.js';
import { logger } from './shared/logger.js';

dotenv.config();

const httpServer = createServer();
const io = new Server(httpServer, {
   adapter: createAdapter(pubClient, subClient),
   cors: {
      origin: process.env.URL_FRONT_END || '*',
      methods: ['GET', 'POST']
   }
});

logger.info('Inicializando servidor WebSocket...');

const userService = createUserService(db);
const messageService = createMessageService(db);

const registerHandler = handleRegister(userService);
const sendMessageHandler = createSendMessageHandler(messageService, io, redisOperations);

io.on('connection', (socket) => {
   logger.info(`Cliente conectado: ${socket.id}`);

   socket.on('register', async (data, callback) => {
      registerHandler(socket, data, async (response: { success: boolean, userId?: string }) => {
         if (response.success && response.userId) {
            await redisOperations.setUserOnline(response.userId, socket.id);
            const count = await redisOperations.getOnlineUsersCount();
            logger.info(`Usuários online: ${count}`);
         }
         if (callback) callback(response);
      });
   });

   socket.on('send-message', (data, callback) => {
      sendMessageHandler(socket, data, callback);
   });

   socket.on('disconnect', async () => {
      const userId = socket.data.userId;
      if (userId) {
         await redisOperations.removeUserOnline(userId);
         const count = await redisOperations.getOnlineUsersCount();
         logger.info(`Usuário ${userId} removido da lista de online. Usuários online: ${count}`);
      }
      handleDisconnect(socket);
   });
});

const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
   logger.info(`Servidor WebSocket rodando na porta ${PORT}`);
});

const shutdown = async () => {
   logger.info('Desligando graciosamente...');
   io.close(async (err) => {
      if (err) {
         logger.error('Erro ao fechar o servidor Socket.IO', err);
      }
      await closeRedisConnections();
      logger.info('Desligamento completo.');
      process.exit(err ? 1 : 0);
   });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);