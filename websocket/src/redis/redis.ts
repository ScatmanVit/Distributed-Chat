import { Redis } from "ioredis"
import dotenv from 'dotenv'
dotenv.config()
 
export const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT)
})

redis.on('ready', async () => {
  console.log('\nRedis pronto para receber comandos!')
})

redis.on('connect', async () => {
  await redis.ping()
  console.log('Redis conectado com sucesso!\n')
})


redis.on('reconnecting', async () => {
  console.log("\nRedis reconectando... Conexão instável")
})

redis.on('error', (err) => {
  console.error('Erro no Redis:', err)
})
