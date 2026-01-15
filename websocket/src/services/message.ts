import { Pool } from 'pg';
import { Message } from '../types/index.js'

export const createMessageService = (pool: Pool) => ({
  save: async (msg: Omit<Message, 'id' | 'sentAt'>): Promise<Message> => {
    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, content, status, sent_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [msg.senderId, msg.receiverId, msg.content, msg.status]
    );
    
    const row = result.rows[0];
    return {
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      content: row.content,
      status: row.status,
      sentAt: row.sent_at
    };
  },

  findBetweenUsers: async (userId1: string, userId2: string): Promise<Message[]> => {
    const result = await pool.query(
      `SELECT * FROM messages
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY sent_at ASC`,
      [userId1, userId2]
    );

    return result.rows.map(row => ({
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      content: row.content,
      status: row.status,
      sentAt: row.sent_at
    }));
  },

  updateStatus: async (messageId: string, status: string): Promise<void> => {
    await pool.query(
      'UPDATE messages SET status = $1 WHERE id = $2',
      [status, messageId]
    );
  }
});

export type MessageService = ReturnType<typeof createMessageService>;
