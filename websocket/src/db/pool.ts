import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

export const db = new Pool({
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    user: process.env.DB_USER || 'user',
    connectionTimeoutMillis: 2000,
    idleTimeoutMillis: 30000,
    max: 20, 
})

db.connect()
  .then(client => {
    console.log('Conectado ao PostgreSQL')
    client.release()
  })
  .catch(err => {
    console.error('Erro ao conectar no PostgreSQL:', err.message)
    process.exit(1) 
  })

db.on('error', (err) => {
  console.error('Erro inesperado no PostgreSQL:', err)
}) 