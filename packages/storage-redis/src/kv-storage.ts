import type { KVStorage } from '@flowrag/core';
import type { createClient } from 'redis';

type RedisClient = ReturnType<typeof createClient>;

export interface RedisKVStorageOptions {
  client: RedisClient;
  prefix?: string;
}

export class RedisKVStorage implements KVStorage {
  private readonly client: RedisClient;
  private readonly prefix: string;

  constructor(options: RedisKVStorageOptions) {
    this.client = options.client;
    this.prefix = options.prefix ?? 'flowrag:kv:';
  }

  private key(k: string): string {
    return `${this.prefix}${k}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.client.get(this.key(key));
    return data ? (JSON.parse(data) as T) : null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.client.set(this.key(key), JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    await this.client.del(this.key(key));
  }

  async list(prefix?: string): Promise<string[]> {
    const pattern = prefix ? `${this.prefix}${prefix}*` : `${this.prefix}*`;
    const keys = await this.client.keys(pattern);
    return keys.map((k) => k.slice(this.prefix.length));
  }

  async clear(): Promise<void> {
    const keys = await this.client.keys(`${this.prefix}*`);
    if (keys.length > 0) await this.client.del(keys);
  }
}
