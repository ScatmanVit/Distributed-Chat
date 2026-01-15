import { Socket } from 'socket.io';
import { validateData } from '../validations/validation.js';
import { registerSchema } from '../validations/schemas.js';
import { UserService } from '../services/user.js';
import { logger } from '../shared/logger.js';

export const handleRegister = (userService: UserService) =>
   async (socket: Socket, data: any, callback: Function) => {
      try {
         const validated = validateData(registerSchema, { userId: data }, callback);

         if (!validated) {
            return;
         }

         await userService.save({
            id: validated.userId,
            username: validated.userId
         });

         socket.data.userId = validated.userId;
         logger.info(`Usuário registrado: ${validated.userId}`);

         if (callback) callback({ success: true, userId: validated.userId });
      } catch (error) {
         logger.error('Erro durante o registro', error as Error);
         if (callback) callback({ success: false, error: 'Erro no servidor durante o registro' });
      }
   };

export const handleDisconnect = (socket: Socket) => {
   const userId = socket.data.userId;
   if (userId) {
      logger.info(`Usuário desconectado: ${userId}`);
   }
};
