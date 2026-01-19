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

const seenMessageSchema = z.array(
  z.object({
    id: z.string()
      .length(36, 'MessageId deve ter exatamente 36 caracteres')
      .regex(/^[a-zA-Z0-9-]+$/, 'MessageId deve conter apenas letras, números ou -'),
    toUserId: z.string()
      .length(36, 'UserId deve ter exatamente 36 caracteres')
      .regex(/^[a-zA-Z0-9-]+$/, 'UserId deve conter apenas letras, números ou -'),
    seen: z.literal(true, "As mensagens não foram marcadas como visualizadas.")
  })
)
.min(1, "Deve haver pelo menos 1 mensagem a ser visualizada")

export { registerSchema, sendMessageSchema, seenMessageSchema }  