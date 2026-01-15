import { describe, test, expect, vi } from 'vitest'
import { validateData } from '../validations/validation.js'
import { registerSchema, sendMessageSchema } from '../validations/schemas.js'


describe('Validação de dados', () => {

   describe('registerSchema', () => {

      test('deve validar userId UUID correto', () => {
         const uuid = '550e8400-e29b-41d4-a716-446655440000'
         const result = validateData(registerSchema, { userId: uuid })

         expect(result).not.toBeNull()
         expect(result?.userId).toBe(uuid)
      })

      test('deve rejeitar userId muito curto', () => {
         const callback = vi.fn()
         const result = validateData(registerSchema, { userId: 'ab' }, callback)

         expect(result).toBeNull()
         expect(callback).toHaveBeenCalledWith({
            success: false,
            errors: expect.arrayContaining([
               expect.objectContaining({
                  field: 'userId',
                  message: expect.stringContaining('36 caracteres')
               })
            ])
         })
      })

      test('deve rejeitar userId muito longo', () => {
         const callback = vi.fn()
         const longId = '550e8400-e29b-41d4-a716-446655440000-extra-long'
         const result = validateData(registerSchema, { userId: longId }, callback)

         expect(result).toBeNull()
         expect(callback).toHaveBeenCalledWith({
            success: false,
            errors: expect.arrayContaining([
               expect.objectContaining({
                  field: 'userId',
                  message: expect.stringContaining('36 caracteres')
               })
            ])
         })
      })

      test('deve rejeitar userId com caracteres inválidos', () => {
         const callback = vi.fn()
         const result = validateData(registerSchema, { userId: '550e8400-e29b-41d4-a716-44665544@000' }, callback)

         expect(result).toBeNull()
         expect(callback).toHaveBeenCalled()
      })
   })

   describe('sendMessageSchema', () => {

      test('deve validar mensagem correta com UUID', () => {
         const result = validateData(sendMessageSchema, {
            toUserId: '550e8400-e29b-41d4-a716-446655440000',
            content: 'Olá, tudo bem?'
         })

         expect(result).not.toBeNull()
         expect(result?.toUserId).toBe('550e8400-e29b-41d4-a716-446655440000')
         expect(result?.content).toBe('Olá, tudo bem?')
      })

      test('deve rejeitar mensagem vazia', () => {
         const callback = vi.fn()
         const result = validateData(sendMessageSchema, {
            toUserId: '550e8400-e29b-41d4-a716-446655440000',
            content: '   '
         }, callback)

         expect(result).toBeNull()
         expect(callback).toHaveBeenCalled()
      })

      test('deve fazer trim no conteúdo', () => {
         const result = validateData(sendMessageSchema, {
            toUserId: '550e8400-e29b-41d4-a716-446655440000',
            content: '  Olá!  '
         })

         expect(result).not.toBeNull()
         expect(result?.content).toBe('Olá!')
      })

      test('deve rejeitar toUserId inválido', () => {
         const callback = vi.fn()
         const result = validateData(sendMessageSchema, {
            toUserId: 'ab',
            content: 'Teste'
         }, callback)

         expect(result).toBeNull()
         expect(callback).toHaveBeenCalled()
      })
   })
})