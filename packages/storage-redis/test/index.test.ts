import { describe, expect, it } from 'vitest';

import { RedisKVStorage, RedisVectorStorage } from '../src/index.js';

describe('storage-redis exports', () => {
  it('should export RedisKVStorage', () => {
    expect(RedisKVStorage).toBeDefined();
  });

  it('should export RedisVectorStorage', () => {
    expect(RedisVectorStorage).toBeDefined();
  });
});
