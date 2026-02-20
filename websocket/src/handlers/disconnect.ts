import { Socket } from 'socket.io';
import { logger } from '../shared/logger.js';

export const handleDisconnect = (socket: Socket) => {
   if (socket.data.userId) {
      logger.info(`Usuário desconectado: ${socket.data.userId}`);
   }
};
