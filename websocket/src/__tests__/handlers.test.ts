import { describe, it, expect, vi } from 'vitest';
import { handleRegister } from '../handlers/register.js';

describe('Handlers', () => {
  it('deve registrar usuário', async () => { 
    const validUserId = 'a1b2c3d4-e5f6-7890-1234-567890abcdef'; 
    const mockUserService = {
      findById: vi.fn().mockResolvedValue({
        id: validUserId,
        username: 'teste'
      })
    }

    const handler = handleRegister(mockUserService as any);
    const mockSocket = {
      data: {},
      join: vi.fn()
    } as any    
    const callback = vi.fn();

    await handler(mockSocket, validUserId, callback);

    expect(mockUserService.findById).toHaveBeenCalledWith(validUserId)
    expect(mockSocket.join).toHaveBeenCalledWith(validUserId)
    expect(callback).toHaveBeenCalledWith({
      success: true,
      userId: validUserId
    })
  });
});
