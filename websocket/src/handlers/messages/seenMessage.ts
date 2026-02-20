import { Socket, Server } from 'socket.io'
import { MessageService } from '../../services/message.js';
import { validateData } from '../../validations/validation.js';
import { seenMessageSchema } from '../../validations/schemas.js'
import { logger } from '../../shared/logger.js';

export const createSendSeenMessageHandler = (
    messageService: MessageService,
    io: Server,
) => async (socket: Socket, data: unknown, callback: Function) => {
    try {
        const validated = validateData(seenMessageSchema, data, callback)
        if (!validated) return

        const readerId = socket.data.userId;
        if (!readerId) {
            callback?.({ success: false, error: 'Autenticação necessária' });
            return;
        }
        
        const msgs = validated.map((msg) => ({
            id: msg.id,
            authorId: msg.toUserId,
            readerId: readerId,
        }))
        
        const messagesSeen = await messageService.markAsSeen(msgs) 
        if (messagesSeen.length === 0) {
            return callback?.({ success: true })
        }
        
        const { authorId } = msgs[0];

        socket.to(readerId).emit('messages-seen-new', messagesSeen);
        io.to(authorId).emit('messages-seen-new', messagesSeen);

        callback?.({ success: true });
    } catch (error) {
         logger.error('Erro ao atualizar status da mensagem', error as Error)
         callback?.({ success: false, error: 'Erro interno ao atualizar status da mensagem' })
        }
    }