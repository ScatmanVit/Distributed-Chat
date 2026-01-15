import { Socket, Server } from 'socket.io';
import { checkRateLimit } from '../shared/rate-limiter.js';
import { validateData } from '../validations/validation.js';
import { sendMessageSchema } from '../validations/schemas.js';
import { MessageService } from '../services/message.js';
import { RedisOperations } from '../redis/index.js';
import { logger } from '../shared/logger.js';

export const createSendMessageHandler = (
   messageService: MessageService,
   io: Server,
   redisOps: RedisOperations
) =>
   async (socket: Socket, data: unknown, callback: Function) => {
      try {
         const validated = validateData(sendMessageSchema, data, callback);
         if (!validated) return;

         const userId = socket.data.userId;
         if (!userId) {
            callback?.({ success: false, error: 'Autenticação necessária' });
            return;
         }

         const rate = await checkRateLimit(redisOps, userId);
         if (!rate.allowed) {
            callback?.({
               success: false,
               error: 'Você está enviando mensagens rápido demais',
               retryAfterMs: rate.retryAfterMs
            });
            return;
         }

         const message = await messageService.save({
            senderId: userId,
            receiverId: validated.toUserId,
            content: validated.content,
            status: 'sent'
         });

         // envia para TODOS os dispositivos do destinatário
         io.to(validated.toUserId).emit('new-message', message);

         // sincroniza todos os dispositivos do remetente
         io.to(userId).emit('message-sent', message);

         callback?.({ success: true, message });
      } catch (error) {
         logger.error('Erro ao enviar mensagem', error as Error);
         callback?.({ success: false, error: 'Erro interno ao enviar mensagem' });
      }
   };
