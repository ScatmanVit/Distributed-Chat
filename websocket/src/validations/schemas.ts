import { z } from 'zod'

const registerSchema = z.object({
  userId: z.string()
    .length(36, 'UserId deve ter exatamente 36 caracteres')  
    .regex(/^[a-zA-Z0-9-]+$/, 'UserId deve conter apenas letras, números ou -')
})

const sendMessageSchema = z.object({
  toUserId: z.string()
    .length(36, 'UserId deve ter exatamente 36 caracteres')
    .regex(/^[a-zA-Z0-9-]+$/, 'UserId deve conter apenas letras, números ou -'),  
  content: z.string()
    .trim()
    .min(1, 'Mensagem não pode estar vazia')
    .max(5000, 'Mensagem muito longa (máximo 5000 caracteres)')
})

export { registerSchema, sendMessageSchema }  