import { mkdir, readdir, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { KVStorage } from '@flowrag/core';

export interface JsonKVStorageOptions {
  path: string;
}

export class JsonKVStorage implements KVStorage {
  private readonly basePath: string;
  private initialized = false;

  constructor(options: JsonKVStorageOptions) {
    this.basePath = options.path;
  }

  private async init(): Promise<void> {
    if (this.initialized) return;
    await mkdir(this.basePath, { recursive: true });
    this.initialized = true;
  }

  private keyToPath(key: string): string {
    // Replace path separators to avoid directory traversal
    const safeKey = key.replace(/[/\\:]/g, '_');
    return join(this.basePath, `${safeKey}.json`);
  }

  private pathToKey(filename: string): string {
    return filename.replace(/\.json$/, '');
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await readFile(this.keyToPath(key), 'utf-8');
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.init();
    await writeFile(this.keyToPath(key), JSON.stringify(value, null, 2));
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.keyToPath(key));
    } catch {
      // Ignore if file doesn't exist
    }
  }

  async list(prefix?: string): Promise<string[]> {
    try {
      const files = await readdir(this.basePath);
      const keys = files.filter((f) => f.endsWith('.json')).map((f) => this.pathToKey(f));

      if (prefix) {
        return keys.filter((k) => k.startsWith(prefix));
      }
      return keys;
    } catch {
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      await rm(this.basePath, { recursive: true, force: true });
      this.initialized = false;
    } catch {
      // Ignore if directory doesn't exist
    }
  }
}
