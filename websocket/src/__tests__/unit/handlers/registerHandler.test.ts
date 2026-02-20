import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleRegister, handleDisconnect } from '../../../handlers/register.js';

describe('Register Handler', () => {
   let mockUserService: any;
   let mockSocket: any;
   let mockCallback: any;

   beforeEach(() => {
      vi.clearAllMocks();
      mockUserService = {
         findById: vi.fn()
      };
      mockSocket = {
         data: {},
         join: vi.fn()
      };
      mockCallback = vi.fn();
   });

   describe('handleRegister', () => {
      it('deve registrar usuário com sucesso', async () => {
         const userId = '550e8400-e29b-41d4-a716-446655440000';
         const user = { id: userId, username: 'testuser' };

         mockUserService.findById.mockResolvedValue(user);

         const handler = handleRegister(mockUserService);
         await handler(mockSocket, userId, mockCallback);

         expect(mockUserService.findById).toHaveBeenCalledWith(userId);
         expect(mockSocket.join).toHaveBeenCalledWith(userId);
         expect(mockSocket.data.userId).toBe(userId);
         expect(mockCallback).toHaveBeenCalledWith({
            success: true,
            userId
         });
      });

      it('deve retornar erro quando usuário não existe', async () => {
         const userId = '550e8400-e29b-41d4-a716-446655440000';

         mockUserService.findById.mockResolvedValue(null);

         const handler = handleRegister(mockUserService);
         await handler(mockSocket, userId, mockCallback);

         expect(mockCallback).toHaveBeenCalledWith({
            success: false,
            error: 'Usuário não existe nesse Id. Tente novamente.'
         });
         expect(mockSocket.join).not.toHaveBeenCalled();
      });

      it('deve retornar erro quando validação falha', async () => {
         const handler = handleRegister(mockUserService);
         await handler(mockSocket, 'invalid', mockCallback);

         expect(mockUserService.findById).not.toHaveBeenCalled();
         expect(mockCallback).toHaveBeenCalledWith({
            success: false,
            errors: expect.any(Array)
         });
      });

      it('deve funcionar sem callback', async () => {
         const userId = '550e8400-e29b-41d4-a716-446655440000';
         const user = { id: userId, username: 'testuser' };

         mockUserService.findById.mockResolvedValue(user);

         const handler = handleRegister(mockUserService);
         await handler(mockSocket, userId);

         expect(mockSocket.join).toHaveBeenCalledWith(userId);
      });
   });

   describe('handleDisconnect', () => {
      it('deve logar desconexão quando há usuário', () => {
         mockSocket.data.userId = 'user-123';

         handleDisconnect(mockSocket);

         expect(mockSocket.data.userId).toBe('user-123');
      });

      it('deve lidar com socket sem userId', () => {
         mockSocket.data = {};

         expect(() => handleDisconnect(mockSocket)).not.toThrow();
      });
   });
});
