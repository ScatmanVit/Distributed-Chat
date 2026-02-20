import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSendSeenMessageHandler } from '../../../handlers/messages/seenMessage.js';

describe('SeenMessage Handler', () => {
   let mockMessageService: any;
   let mockIo: any;
   let mockSocket: any;
   let mockCallback: any;

   beforeEach(() => {
      vi.clearAllMocks();
      mockMessageService = {
         markAsSeen: vi.fn()
      };
      mockIo = {
         to: vi.fn().mockReturnValue({
            emit: vi.fn()
         })
      };
      mockSocket = {
         data: {
            userId: '550e8400-e29b-41d4-a716-446655440000'
         }
      };
      mockCallback = vi.fn();
   });

   describe('markAsSeen', () => {
      it('deve marcar mensagens como lidas', async () => {
         const data = [
            {
               id: '550e8400-e29b-41d4-a716-446655440001',
               toUserId: '550e8400-e29b-41d4-a716-446655440002',
               seen: true
            }
         ];
         const messagesSeen = [
            {
               id: '550e8400-e29b-41d4-a716-446655440001',
               senderId: '550e8400-e29b-41d4-a716-446655440002',
               receiverId: mockSocket.data.userId,
               status: 'read',
               sentAt: new Date()
            }
         ];

         mockMessageService.markAsSeen.mockResolvedValue(messagesSeen);

         const handler = createSendSeenMessageHandler(mockMessageService, mockIo);
         await handler(mockSocket, data, mockCallback);

         expect(mockMessageService.markAsSeen).toHaveBeenCalledWith([
            {
               id: '550e8400-e29b-41d4-a716-446655440001',
               senderId: mockSocket.data.userId,
               receiverId: '550e8400-e29b-41d4-a716-446655440002'
            }
         ]);
         expect(mockIo.to).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
         expect(mockCallback).toHaveBeenCalledWith({ success: true });
      });

      it('deve marcar múltiplas mensagens como lidas', async () => {
         const data = [
            { id: '550e8400-e29b-41d4-a716-446655440001', toUserId: '550e8400-e29b-41d4-a716-446655440002', seen: true },
            { id: '550e8400-e29b-41d4-a716-446655440003', toUserId: '550e8400-e29b-41d4-a716-446655440002', seen: true }
         ];
         const messagesSeen = [
            { id: '550e8400-e29b-41d4-a716-446655440001', senderId: '550e8400-e29b-41d4-a716-446655440002', receiverId: mockSocket.data.userId, status: 'read', sentAt: new Date() },
            { id: '550e8400-e29b-41d4-a716-446655440003', senderId: '550e8400-e29b-41d4-a716-446655440002', receiverId: mockSocket.data.userId, status: 'read', sentAt: new Date() }
         ];

         mockMessageService.markAsSeen.mockResolvedValue(messagesSeen);

         const handler = createSendSeenMessageHandler(mockMessageService, mockIo);
         await handler(mockSocket, data, mockCallback);

         expect(mockMessageService.markAsSeen).toHaveBeenCalledWith([
            { id: '550e8400-e29b-41d4-a716-446655440001', senderId: mockSocket.data.userId, receiverId: '550e8400-e29b-41d4-a716-446655440002' },
            { id: '550e8400-e29b-41d4-a716-446655440003', senderId: mockSocket.data.userId, receiverId: '550e8400-e29b-41d4-a716-446655440002' }
         ]);
      });

      it('deve retornar success mesmo quando nenhuma mensagem atualizada', async () => {
         const data = [
            { id: '550e8400-e29b-41d4-a716-446655440001', toUserId: '550e8400-e29b-41d4-a716-446655440002', seen: true }
         ];

         mockMessageService.markAsSeen.mockResolvedValue([]);

         const handler = createSendSeenMessageHandler(mockMessageService, mockIo);
         await handler(mockSocket, data, mockCallback);

         expect(mockIo.to).not.toHaveBeenCalled();
         expect(mockCallback).toHaveBeenCalledWith({ success: true });
      });

      it('deve retornar erro quando não autenticado', async () => {
         mockSocket.data = {};

         const handler = createSendSeenMessageHandler(mockMessageService, mockIo);
         await handler(mockSocket, [
            { id: '550e8400-e29b-41d4-a716-446655440001', toUserId: '550e8400-e29b-41d4-a716-446655440002', seen: true }
         ], mockCallback);

         expect(mockCallback).toHaveBeenCalledWith({
            success: false,
            error: 'Autenticação necessária'
         });
      });

      it('deve retornar erro quando validação falha', async () => {
         const handler = createSendSeenMessageHandler(mockMessageService, mockIo);
         await handler(mockSocket, [{ id: 'invalid' }], mockCallback);

         expect(mockMessageService.markAsSeen).not.toHaveBeenCalled();
         expect(mockCallback).toHaveBeenCalledWith({
            success: false,
            errors: expect.any(Array)
         });
      });

      it('deve retornar erro quando array vazio', async () => {
         const handler = createSendSeenMessageHandler(mockMessageService, mockIo);
         await handler(mockSocket, [], mockCallback);

         expect(mockMessageService.markAsSeen).not.toHaveBeenCalled();
         expect(mockCallback).toHaveBeenCalledWith({
            success: false,
            errors: expect.any(Array)
         });
      });
   });
});
