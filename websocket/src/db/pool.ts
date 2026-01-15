import { Pool } from 'pg';
import { logger } from '../shared/logger.js';
import dotenv from 'dotenv'
dotenv.config() 

export const db = new Pool({
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    connectionTimeoutMillis: 2000,
    idleTimeoutMillis: 30000,
    max: 20,
});

db.connect()
  .then(client => {
    logger.info('Conectado ao PostgreSQL');
    client.release();
  })
  .catch(err => {
    logger.error('Erro ao conectar no PostgreSQL:', err);
    process.exit(1);
  });

db.on('error', (err) => {
  logger.error('Erro inesperado no PostgreSQL:', err);
});