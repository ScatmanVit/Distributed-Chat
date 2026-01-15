import { Pool } from 'pg';
import { User } from '../types/index.js';

export const createUserService = (pool: Pool) => ({
   save: async (user: User): Promise<User> => {
      const result = await pool.query(
         `INSERT INTO users (id, username) VALUES ($1, $2)
       ON CONFLICT (id) DO NOTHING
       RETURNING *`,
         [user.id, user.username]
      );

      const row = result.rows[0];
      return { id: row.id, username: row.username };
   },

   findById: async (id: string): Promise<User | null> => {
      const result = await pool.query(
         'SELECT * FROM users WHERE id = $1',
         [id]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return { id: row.id, username: row.username };
   }
});

export type UserService = ReturnType<typeof createUserService>;
