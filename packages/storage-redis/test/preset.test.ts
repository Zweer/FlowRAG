import { describe, expect, it, vi } from 'vitest';

vi.mock('redis', () => ({
  createClient: vi.fn().mockReturnValue({
    connect: vi.fn().mockResolvedValue(undefined),
  }),
}));

const { createRedisStorage } = await import('../src/preset.js');

describe('createRedisStorage', () => {
  it('creates kv and vector storage', () => {
    const { kv, vector } = createRedisStorage({ dimensions: 384 });
    expect(kv).toBeDefined();
    expect(vector).toBeDefined();
  });

  it('passes url to createClient', async () => {
    const { createClient } = await import('redis');
    createRedisStorage({ url: 'redis://localhost:6379', dimensions: 768 });
    expect(createClient).toHaveBeenCalledWith({ url: 'redis://localhost:6379' });
  });
});
