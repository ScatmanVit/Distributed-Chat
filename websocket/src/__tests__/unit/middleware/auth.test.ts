import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuthMiddleware } from '../../../middleware/auth.js';

describe('Auth Middleware', () => {
   let mockJwt: any;
   let mockUserService: any;
   let mockSocket: any;
   let mockNext: any;

   beforeEach(() => {
      vi.clearAllMocks();
      mockJwt = {
         verify: vi.fn()
      };
      mockUserService = {
         findById: vi.fn()
      };
      mockNext = vi.fn();
      mockSocket = {
         handshake: {
            auth: {}
         },
         data: {},
         join: vi.fn()
      };
   });

   describe('validação do token', () => {
      it('deve retornar erro quando token não fornecido', () => {
         mockSocket.handshake.auth = {};

         const middleware = createAuthMiddleware(mockJwt, mockUserService);
         middleware(mockSocket, mockNext);

         expect(mockNext).toHaveBeenCalledWith(
            new Error('Acesso negado: Token não fornecido')
         );
         expect(mockJwt.verify).not.toHaveBeenCalled();
      });

      it('deve retornar erro quando token não é string', () => {
         mockSocket.handshake.auth = { token: 123 };

         const middleware = createAuthMiddleware(mockJwt, mockUserService);
         middleware(mockSocket, mockNext);

         expect(mockNext).toHaveBeenCalledWith(
            new Error('Acesso negado: Token não fornecido')
         );
      });

      it('deve retornar erro quando token é inválido', () => {
         mockSocket.handshake.auth = { token: 'token-invalido' };
         mockJwt.verify.mockImplementation(() => { throw new Error('Invalid token'); });

         const middleware = createAuthMiddleware(mockJwt, mockUserService);
         middleware(mockSocket, mockNext);

         expect(mockJwt.verify).toHaveBeenCalledWith('token-invalido', expect.any(String));
         expect(mockNext).toHaveBeenCalledWith(
            new Error('Acesso negado: Token inválido')
         );
      });
   });

   describe('validação do usuário', () => {
      it('deve retornar erro quando usuário não existe no banco', async () => {
         mockSocket.handshake.auth = { token: 'token-valido' };
         mockJwt.verify.mockReturnValue({ userId: 'user-123' });
         mockUserService.findById.mockResolvedValue(null);

         const middleware = createAuthMiddleware(mockJwt, mockUserService);
         await middleware(mockSocket, mockNext);

         expect(mockUserService.findById).toHaveBeenCalledWith('user-123');
         expect(mockNext).toHaveBeenCalledWith(
            new Error('Acesso negado: Usuário não encontrado')
         );
      });
   });

   describe('autenticação bem-sucedida', () => {
      it('deve autenticar usuário com sucesso', async () => {
         mockSocket.handshake.auth = { token: 'token-valido' };
         const mockUser = { id: 'user-123', name: 'Test User' };
         mockJwt.verify.mockReturnValue({ userId: 'user-123' });
         mockUserService.findById.mockResolvedValue(mockUser);

         const middleware = createAuthMiddleware(mockJwt, mockUserService);
         await middleware(mockSocket, mockNext);

         expect(mockSocket.data.userId).toBe('user-123');
         expect(mockSocket.join).toHaveBeenCalledWith('user-123');
         expect(mockNext).toHaveBeenCalledWith();
      });
   });
});
