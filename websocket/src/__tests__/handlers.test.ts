import { describe, it, expect, vi } from 'vitest';
import { handleRegister } from '../handlers/connection';

describe('Handlers', () => {
  it('deve registrar usuário', async () => {
    const validUserId = 'a1b2c3d4-e5f6-7890-1234-567890abcdef'; 
    const mockUserService = {
      save: vi.fn().mockResolvedValue({ id: validUserId, username: validUserId })
    };

    const handler = handleRegister(mockUserService as any);
    const mockSocket = { data: {} } as any;
    const callback = vi.fn();

    await handler(mockSocket, validUserId, callback);

    expect(mockUserService.save).toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith({ success: true, userId: validUserId });
  });
});
