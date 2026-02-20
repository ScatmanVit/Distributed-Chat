import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSendMessageHandler } from '../../../handlers/messages/message.js';

describe('SendMessage Handler', () => {
   let mockMessageService: any;
   let mockIo: any;
   let mockRedisOps: any;
   let mockSocket: any;
   let mockCallback: any;

   beforeEach(() => {
      vi.clearAllMocks();
      mockMessageService = {
         save: vi.fn()
      };
      mockIo = {
         to: vi.fn().mockReturnValue({
            emit: vi.fn()
         })
      };
      mockRedisOps = {
         isRateLimited: vi.fn(),
         incrementRate: vi.fn(),
         blockRate: vi.fn()
      };
      mockSocket = {
         data: {
            userId: '550e8400-e29b-41d4-a716-446655440000'
         },
         to: vi.fn().mockReturnValue({
            emit: vi.fn()
         })
      };
      mockCallback = vi.fn();
   });

   describe('envio de mensagem', () => {
      it('deve enviar mensagem com sucesso', async () => {
         const data = {
            toUserId: '550e8400-e29b-41d4-a716-446655440001',
            content: 'Olá, tudo bem?'
         };
         const savedMessage = {
            id: 'msg-123',
            senderId: mockSocket.data.userId,
            receiverId: data.toUserId,
            content: data.content,
            status: 'sent',
            sentAt: new Date()
         };

         mockRedisOps.isRateLimited.mockResolvedValue(null);
         mockRedisOps.incrementRate.mockResolvedValue(1);
         mockMessageService.save.mockResolvedValue(savedMessage);

         const handler = createSendMessageHandler(mockMessageService, mockIo, mockRedisOps);
         await handler(mockSocket, data, mockCallback);

         expect(mockMessageService.save).toHaveBeenCalledWith({
            senderId: mockSocket.data.userId,
            receiverId: data.toUserId,
            content: data.content,
            status: 'sent'
         });
         expect(mockIo.to).toHaveBeenCalledWith(data.toUserId);
         expect(mockCallback).toHaveBeenCalledWith({
            success: true,
            message: savedMessage
         });
      });

      it('deve bloquear quando rate limit excedido', async () => {
         const data = {
            toUserId: '550e8400-e29b-41d4-a716-446655440001',
            content: 'Mensagem'
         };

         mockRedisOps.isRateLimited.mockResolvedValue(null);
         mockRedisOps.incrementRate.mockResolvedValue(25);

         const handler = createSendMessageHandler(mockMessageService, mockIo, mockRedisOps);
         await handler(mockSocket, data, mockCallback);

         expect(mockMessageService.save).not.toHaveBeenCalled();
         expect(mockCallback).toHaveBeenCalledWith({
            success: false,
            error: 'Você está enviando mensagens rápido demais',
            retryAfterMs: 30000
         });
      });

      it('deve bloquear quando usuário está bloqueado', async () => {
         const data = {
            toUserId: '550e8400-e29b-41d4-a716-446655440001',
            content: 'Mensagem'
         };

         mockRedisOps.isRateLimited.mockResolvedValue(15000);

         const handler = createSendMessageHandler(mockMessageService, mockIo, mockRedisOps);
         await handler(mockSocket, data, mockCallback);

         expect(mockMessageService.save).not.toHaveBeenCalled();
         expect(mockCallback).toHaveBeenCalledWith({
            success: false,
            error: 'Você está enviando mensagens rápido demais',
            retryAfterMs: 15000
         });
      });

      it('deve retornar erro quando usuário não autenticado', async () => {
         mockSocket.data = {};

         const handler = createSendMessageHandler(mockMessageService, mockIo, mockRedisOps);
         await handler(mockSocket, { 
            toUserId: '550e8400-e29b-41d4-a716-446655440001',
            content: 'Test'
         }, mockCallback);

         expect(mockCallback).toHaveBeenCalledWith({
            success: false,
            error: 'Autenticação necessária'
         });
      });

      it('deve retornar erro quando validação falha', async () => {
         const handler = createSendMessageHandler(mockMessageService, mockIo, mockRedisOps);
         await handler(mockSocket, { toUserId: 'invalid' }, mockCallback);

         expect(mockMessageService.save).not.toHaveBeenCalled();
         expect(mockCallback).toHaveBeenCalledWith({
            success: false,
            errors: expect.any(Array)
         });
      });
   });
});
