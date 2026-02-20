import { Socket } from 'socket.io';
import { logger } from '../shared/logger.js';
import { UserService } from '../services/user.js';

interface JwtProvider {
   verify(token: string, secret: string): any;
}

export const createAuthMiddleware = (jwt: JwtProvider, userService: UserService) => 
   async (socket: Socket, next: (err?: Error) => void) => {
      const token = socket.handshake.auth?.token

      if (!token || typeof token !== 'string') {
         return next(new Error('Acesso negado: Token não fornecido'));
      }

      try {
         const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
         const userId = decoded.userId;

         const user = await userService.findById(userId);
         if (!user) {
            return next(new Error('Acesso negado: Usuário não encontrado'));
         }

         socket.data.userId = user.id;
         socket.join(user.id);

         logger.info(`Usuário autenticado e entrou na room: ${user.id}`);
         next();
      } catch (err) {
         logger.error('Erro na validação do Token JWT', err as Error);
         next(new Error('Acesso negado: Token inválido'));
      }
   };