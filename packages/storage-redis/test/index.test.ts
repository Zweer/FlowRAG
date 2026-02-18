import { describe, expect, it, vi } from 'vitest';

vi.mock('redis', () => ({
  createClient: vi.fn().mockReturnValue({ connect: vi.fn() }),
}));

const { RedisKVStorage, RedisVectorStorage, createRedisStorage } = await import('../src/index.js');

describe('storage-redis exports', () => {
  it('should export RedisKVStorage', () => {
    expect(RedisKVStorage).toBeDefined();
  });

  it('should export RedisVectorStorage', () => {
    expect(RedisVectorStorage).toBeDefined();
  });

  it('should export createRedisStorage', () => {
    expect(createRedisStorage).toBeDefined();
  });
});
