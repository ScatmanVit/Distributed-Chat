import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUserService, UserService } from '../../../services/user.js';

describe('UserService', () => {
   let mockPool: any;
   let userService: UserService;

   beforeEach(() => {
      vi.clearAllMocks();
      mockPool = {
         query: vi.fn()
      };
      userService = createUserService(mockPool);
   });

   describe('findById', () => {
      it('deve retornar usuário quando encontrado', async () => {
         const userId = '550e8400-e29b-41d4-a716-446655440000';
         const mockUser = {
            id: userId,
            username: 'johndoe'
         };

         mockPool.query.mockResolvedValue({
            rows: [mockUser]
         });

         const result = await userService.findById(userId);

         expect(result).toEqual({
            id: userId,
            username: 'johndoe'
         });
         expect(mockPool.query).toHaveBeenCalledWith(
            'SELECT * FROM users WHERE id = $1',
            [userId]
         );
      });

      it('deve retornar null quando usuário não encontrado', async () => {
         const userId = '550e8400-e29b-41d4-a716-446655440000';

         mockPool.query.mockResolvedValue({
            rows: []
         });

         const result = await userService.findById(userId);

         expect(result).toBeNull();
         expect(mockPool.query).toHaveBeenCalledWith(
            'SELECT * FROM users WHERE id = $1',
            [userId]
         );
      });

      it('deve mapear corretamente os campos do banco', async () => {
         const userId = '550e8400-e29b-41d4-a716-446655440000';
         const mockDbRow = {
            id: userId,
            username: 'testuser',
            created_at: new Date(),
            email: 'test@example.com'
         };

         mockPool.query.mockResolvedValue({
            rows: [mockDbRow]
         });

         const result = await userService.findById(userId);

         expect(result).toEqual({
            id: userId,
            username: 'testuser'
         });
      });
   });
});
