import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMessageService, MessageService } from '../../../services/message.js';

describe('MessageService', () => {
   let mockPool: any;
   let messageService: MessageService;

   beforeEach(() => {
      vi.clearAllMocks();
      mockPool = {
         query: vi.fn()
      };
      messageService = createMessageService(mockPool);
   });

   describe('save', () => {
      it('deve salvar mensagem e retornar com id e sentAt', async () => {
         const messageData = {
            senderId: '550e8400-e29b-41d4-a716-446655440000',
            receiverId: '550e8400-e29b-41d4-a716-446655440001',
            content: 'Olá, tudo bem?',
            status: 'sent' as const
         };

         const sentAt = new Date('2024-01-15T10:00:00Z');

         mockPool.query.mockResolvedValue({
            rows: [{
               id: 'msg-123',
               sender_id: messageData.senderId,
               receiver_id: messageData.receiverId,
               content: messageData.content,
               status: messageData.status,
               sent_at: sentAt
            }]
         });

         const result = await messageService.save(messageData);

         expect(result).toEqual({
            id: 'msg-123',
            senderId: messageData.senderId,
            receiverId: messageData.receiverId,
            content: messageData.content,
            status: messageData.status,
            sentAt: sentAt
         });
         expect(mockPool.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO messages'),
            [
               messageData.senderId,
               messageData.receiverId,
               messageData.content,
               messageData.status
            ]
         );
      });

      it('deve mapear corretamente campos do banco para o domínio', async () => {
         const messageData = {
            senderId: 'sender-id',
            receiverId: 'receiver-id',
            content: 'Test',
            status: 'sent' as const
         };

         mockPool.query.mockResolvedValue({
            rows: [{
               id: 'new-msg-id',
               sender_id: 'sender-id',
               receiver_id: 'receiver-id',
               content: 'Test',
               status: 'sent',
               sent_at: new Date()
            }]
         });

         const result = await messageService.save(messageData);

         expect(result).toMatchObject({
            id: 'new-msg-id',
            senderId: 'sender-id',
            receiverId: 'receiver-id',
            content: 'Test',
            status: 'sent'
         });
      });
   });

   describe('markAsSeen', () => {
      it('deve marcar mensagens como lidas', async () => {
         const msgs = [
            { id: 'msg-1', senderId: 'sender-1', receiverId: 'receiver-1' },
            { id: 'msg-2', senderId: 'sender-1', receiverId: 'receiver-1' }
         ];

         mockPool.query.mockResolvedValue({
            rows: [
               {
                  id: 'msg-1',
                  sender_id: 'sender-1',
                  receiver_id: 'receiver-1',
                  status: 'read',
                  sent_at: new Date()
               },
               {
                  id: 'msg-2',
                  sender_id: 'sender-1',
                  receiver_id: 'receiver-1',
                  status: 'read',
                  sent_at: new Date()
               }
            ]
         });

         const result = await messageService.markAsSeen(msgs);

         expect(result).toHaveLength(2);
         expect(result[0].status).toBe('read');
         expect(result[1].status).toBe('read');
      });

      it('deve retornar array vazio quando nenhuma mensagem for atualizada', async () => {
         const msgs = [
            { id: 'msg-1', senderId: 'sender-1', receiverId: 'receiver-1' }
         ];

         mockPool.query.mockResolvedValue({
            rows: []
         });

         const result = await messageService.markAsSeen(msgs);

         expect(result).toHaveLength(0);
      });

      it('deve filtrar mensagens já lidas', async () => {
         const msgs = [
            { id: 'msg-1', senderId: 'sender-1', receiverId: 'receiver-1' }
         ];

         mockPool.query.mockResolvedValue({
            rows: []
         });

         await messageService.markAsSeen(msgs);

         expect(mockPool.query).toHaveBeenCalledWith(
            expect.stringContaining("AND status <> 'read'"),
            expect.any(Array)
         );
      });
   });

   describe('findBetweenUsers', () => {
      it('deve buscar mensagens entre dois usuários', async () => {
         const userId1 = 'user-1';
         const userId2 = 'user-2';

         const mockMessages = [
            {
               id: 'msg-1',
               sender_id: userId1,
               receiver_id: userId2,
               content: 'Oi',
               status: 'read',
               sent_at: new Date()
            },
            {
               id: 'msg-2',
               sender_id: userId2,
               receiver_id: userId1,
               content: 'Oi, tudo bem?',
               status: 'read',
               sent_at: new Date()
            }
         ];

         mockPool.query.mockResolvedValue({
            rows: mockMessages
         });

         const result = await messageService.findBetweenUsers(userId1, userId2);

         expect(result).toHaveLength(2);
         expect(mockPool.query).toHaveBeenCalledWith(
            expect.stringContaining('WHERE (sender_id = $1 AND receiver_id = $2)'),
            [userId1, userId2]
         );
      });

      it('deve retornar array vazio quando não houver mensagens', async () => {
         mockPool.query.mockResolvedValue({
            rows: []
         });

         const result = await messageService.findBetweenUsers('user-1', 'user-2');

         expect(result).toHaveLength(0);
      });
   });

   describe('updateStatus', () => {
      it('deve atualizar status da mensagem', async () => {
         const messageId = 'msg-123';
         const newStatus = 'delivered';

         await messageService.updateStatus(messageId, newStatus);

         expect(mockPool.query).toHaveBeenCalledWith(
            'UPDATE messages SET status = $1 WHERE id = $2',
            [newStatus, messageId]
         );
      });

      it('deve atualizar para status failed', async () => {
         const messageId = 'msg-123';

         await messageService.updateStatus(messageId, 'failed');

         expect(mockPool.query).toHaveBeenCalledWith(
            'UPDATE messages SET status = $1 WHERE id = $2',
            ['failed', messageId]
         );
      });
   });
});
