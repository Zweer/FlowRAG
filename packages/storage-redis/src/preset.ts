import type { KVStorage, VectorStorage } from '@flowrag/core';
import { createClient } from 'redis';

import { RedisKVStorage } from './kv-storage.js';
import { RedisVectorStorage } from './vector-storage.js';

export interface RedisStorageOptions {
  url?: string;
  dimensions: number;
}

export function createRedisStorage(options: RedisStorageOptions): {
  kv: KVStorage;
  vector: VectorStorage;
} {
  const client = createClient({ url: options.url });
  client.connect();
  return {
    kv: new RedisKVStorage({ client }),
    vector: new RedisVectorStorage({ client, dimensions: options.dimensions }),
  };
}
