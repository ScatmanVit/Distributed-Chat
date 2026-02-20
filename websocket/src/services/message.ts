import { Pool } from 'pg';
import { Message, SeenMessageArray, SeenMessageInput, MessageStatus } from '../types/index.js'

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

  markAsSeen: async (msgs: SeenMessageInput[]): Promise<SeenMessageArray> => {
    if (msgs.length === 0) return [];
    
    const messageIds = msgs.map(m => m.id);
    const { authorId, readerId } = msgs[0];
    
    const result = await pool.query( 
      `UPDATE messages
        SET status = 'read'
        WHERE id = ANY($1)
          AND receiver_id = $2
          AND sender_id = $3
          AND status <> 'read'
        RETURNING id, sender_id, receiver_id, status, sent_at;`,
        [messageIds, readerId, authorId]
    );
    
    return result.rows.map(row => ({
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      status: row.status,
      sentAt: row.sent_at
    }));
  },

  markAsDelivered: async (messageId: string): Promise<void> => {
    await pool.query(
      `UPDATE messages 
       SET status = 'delivered' 
       WHERE id = $1 AND status = 'sent'`,
      [messageId]
    );
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

  updateStatus: async (messageId: string, status: MessageStatus): Promise<void> => {
    await pool.query(
      'UPDATE messages SET status = $1 WHERE id = $2',
      [status, messageId]
    );
  }
});

export type MessageService = ReturnType<typeof createMessageService>;
