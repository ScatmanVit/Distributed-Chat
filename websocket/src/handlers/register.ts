import { Socket } from 'socket.io';
import { validateData } from '../validations/validation.js';
import { registerSchema } from '../validations/schemas.js';
import { UserService } from '../services/user.js';
import { logger } from '../shared/logger.js';

export const handleRegister = (userService: UserService) =>
   async (socket: Socket, data: any, callback: Function) => {
      try {
         const validated = validateData(registerSchema, { userId: data }, callback);
         if (!validated) return;

         const user = await userService.findById(validated.userId)
         if (!user) {
            return callback?.({ success: false, error: "Usuário não existe nesse Id. Tente novamente." });
         }

         socket.data.userId = user.id;
         socket.join(user.id);

         logger.info(`Usuário registrado e entrou na room: ${validated.userId}`);
         callback?.({ success: true, userId: validated.userId });
      } catch (error) {
         logger.error('Erro durante o registro', error as Error);
         callback?.({ success: false, error: 'Erro no servidor durante o registro' });
      }
   };

export const handleDisconnect = (socket: Socket) => {
   if (socket.data.userId) {
      logger.info(`Usuário desconectado: ${socket.data.userId}`);
   }
};
