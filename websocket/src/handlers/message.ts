import { Socket, Server } from 'socket.io';
import { validateData } from '../validations/validation.js';
import { sendMessageSchema } from '../validations/schemas.js';
import { MessageService } from '../services/message.js';
import { RedisOperations } from '../redis/index.js';
import { logger } from '../shared/logger.js';

export const createSendMessageHandler = (
   messageService: MessageService,
   io: Server,
   redis: RedisOperations
) =>
   async (socket: Socket, data: unknown, callback: Function) => {
      try {
         const validated = validateData(sendMessageSchema, data, callback);
         if (!validated) {
            return;
         }

         if (!socket.data.userId) {
            logger.warn('Usuário não autenticado tentou enviar uma mensagem', { socketId: socket.id });
            if (callback) callback({ success: false, error: 'Autenticação necessária' });
            return;
         }

         const message = await messageService.save({
            senderId: socket.data.userId,
            receiverId: validated.toUserId,
            content: validated.content,
            status: 'sent'
         });

         logger.info(`Mensagem salva: ${message.id}`);

         const recipientSocketId = await redis.getUserSocketId(validated.toUserId);

         if (recipientSocketId) {
            io.to(recipientSocketId).emit('new-message', message);
            await messageService.updateStatus(message.id, 'delivered');
            message.status = 'delivered';
            logger.info(`Mensagem entregue para usuário online: ${validated.toUserId}`);
         } else {
            logger.info(`Destinatário não está online: ${validated.toUserId}`);
         }

         socket.emit('message-sent', message);
         if (callback) callback({ success: true, message });
      } catch (error) {
         logger.error('Erro ao enviar mensagem', error as Error);
         if (callback) callback({ success: false, error: 'Erro no servidor ao enviar mensagem' });
      }
   };