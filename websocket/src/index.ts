import { registerSchema, sendMessageSchema } from './validations/schemas'
import { validateData } from './validations/validation'
import { Server } from 'socket.io'
import { db } from './db/pool'
import dotenv from 'dotenv'

dotenv.config()

const io = new Server({
   cors: {
      origin: process.env.URL_FRONT_END,
      methods: ['GET', 'POST'],
   }
})

console.log('🚀 Inicializando servidor WebSocket...')

const onlineUsers = new Map()

io.on('connection', (socket) => {
   console.log(`Cliente conectado: ${socket.id}`)

   socket.on('register', (data, callback) => {
      const validated = validateData(registerSchema, { userId: data }, callback)
      if (!validated) return

      const { userId } = validated
      onlineUsers.set(userId, socket.id)
      socket.data.userId = userId

      console.log(`Usuário registrado: ${userId}`)
      console.log(`Total online: ${onlineUsers.size}`)

      if (callback) callback({ success: true, userId })
   })

   socket.on('send-message', async (data, callback) => {
      const validated = validateData(sendMessageSchema, data, callback)
      if (!validated) return

      if (!socket.data.userId) {
         console.log('Usuário não registrado tentou enviar mensagem')
         if (callback) {
            callback({
               success: false,
               errors: [{ field: 'auth', message: 'Você precisa se registrar primeiro' }]
            })
         }
         return
      }

      try {
         const result = await db.query(`
            INSERT INTO messages (sender_id, receiver_id, content, status)
            VALUES ($1, $2, $3, $4)
            RETURNING *
         `, [
               socket.data.userId,
               validated.toUserId,
               validated.content,
            'sent'
         ])

         const savedMessage = result.rows[0]
         console.log(`Mensagem salva no banco: ${savedMessage.id}`)

         const message = {
            id: savedMessage.id,
            content: savedMessage.content,
            fromUserId: savedMessage.sender_id,
            toUserId: savedMessage.receiver_id,
            timestamp: savedMessage.sent_at,
            status: savedMessage.status
         }

         const recipientSocketId = onlineUsers.get(validated.toUserId)

         if (recipientSocketId) {
            io.to(recipientSocketId).emit('new-message', message)
            console.log(`Enviado de ${message.fromUserId} para ${validated.toUserId}`)

            await db.query(`
               UPDATE messages 
               SET status = 'delivered' 
               WHERE id = $1
        `, [savedMessage.id])

            message.status = 'delivered'
         } else {
            console.log(`${validated.toUserId} não está online (mensagem salva no banco)`)
         }

         socket.emit('message-sent', message)

         if (callback) {
            callback({ success: true, message })
         }

      } catch (error) {
         console.error('Erro ao salvar mensagem no banco:', error)

         if (callback) {
            callback({
               success: false,
               errors: [{
                  field: 'database',
                  message: 'Erro ao salvar mensagem. Tente novamente.'
               }]
            })
         }
      }
   })

   socket.on('disconnect', () => {
      const userId = socket.data.userId
      if (userId) {
         onlineUsers.delete(userId)
         console.log(`${userId} desconectou`)
         console.log(`Total online: ${onlineUsers.size}`)
      }
   })
})

const PORT = process.env.PORT
io.listen(Number(PORT))
console.log(`WebSocket rodando na porta ${PORT}`)