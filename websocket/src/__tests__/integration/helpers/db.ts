import { Pool } from 'pg';

let pool: Pool | null = null;
let isCleaningUp = false;

const createTestDbPool = (): Pool => {
  const dbName = process.env.DB_NAME || 'chat_db_test';
  return new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: dbName,
    user: process.env.DB_USER || 'user',
    password: process.env.DB_PASSWORD || 'password',
    max: 10,
  });
};

const getPool = (): Pool => {
  if (!pool) {
    pool = createTestDbPool();
  }
  return pool;
};

export const testDb = {
  query: async (text: string, params?: any[]) => {
    return getPool().query(text, params);
  }
};

export async function clearDatabase(): Promise<void> {
  while (isCleaningUp) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  isCleaningUp = true;
  
  try {
    await testDb.query('DELETE FROM messages');
    await testDb.query('DELETE FROM users');
    await new Promise(resolve => setTimeout(resolve, 50));
  } finally {
    isCleaningUp = false;
  }
}

export async function insertTestUser(id: string, username: string): Promise<void> {
  await testDb.query(
    `INSERT INTO users (id, username, password_hash) 
     VALUES ($1, $2, $3) 
     ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username`,
    [id, username, 'test_hash']
  );
}

export async function getMessagesBetweenUsers(userId1: string, userId2: string) {
  const result = await testDb.query(
    `SELECT * FROM messages 
     WHERE (sender_id = $1 AND receiver_id = $2)
        OR (sender_id = $2 AND receiver_id = $1)
     ORDER BY sent_at ASC`,
    [userId1, userId2]
  );
  return result.rows;
}

export async function getMessageById(messageId: string) {
  const result = await testDb.query('SELECT * FROM messages WHERE id = $1', [messageId]);
  return result.rows[0];
}

export async function closeTestDb() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
