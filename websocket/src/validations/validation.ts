import { z } from 'zod'

export function validateData<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    callback?: Function
): T | null {
    const result = schema.safeParse(data)

    if (!result.success) {
        const errors = result.error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message
        }))

        console.error('Erro de validação:', errors)

        if (callback) {
            callback({ success: false, errors })
        }

        return null
    }

    return result.data
}