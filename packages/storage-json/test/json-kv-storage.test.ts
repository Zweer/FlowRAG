import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { JsonKVStorage } from '../src/index.js';

describe('JsonKVStorage', () => {
  let storage: JsonKVStorage;
  let testPath: string;

  beforeEach(() => {
    testPath = join(tmpdir(), `flowrag-test-${Date.now()}`);
    storage = new JsonKVStorage({ path: testPath });
  });

  afterEach(async () => {
    await rm(testPath, { recursive: true, force: true });
  });

  describe('get/set', () => {
    it('should return null for non-existent key', async () => {
      const result = await storage.get('missing');
      expect(result).toBeNull();
    });

    it('should store and retrieve string value', async () => {
      await storage.set('key1', 'hello');
      const result = await storage.get<string>('key1');
      expect(result).toBe('hello');
    });

    it('should store and retrieve object value', async () => {
      const obj = { name: 'test', count: 42 };
      await storage.set('key2', obj);
      const result = await storage.get<typeof obj>('key2');
      expect(result).toEqual(obj);
    });

    it('should overwrite existing value', async () => {
      await storage.set('key', 'first');
      await storage.set('key', 'second');
      const result = await storage.get<string>('key');
      expect(result).toBe('second');
    });
  });

  describe('delete', () => {
    it('should delete existing key', async () => {
      await storage.set('key', 'value');
      await storage.delete('key');
      const result = await storage.get('key');
      expect(result).toBeNull();
    });

    it('should not throw when deleting non-existent key', async () => {
      await expect(storage.delete('missing')).resolves.not.toThrow();
    });
  });

  describe('list', () => {
    it('should return empty array when no keys', async () => {
      const keys = await storage.list();
      expect(keys).toEqual([]);
    });

    it('should list all keys', async () => {
      await storage.set('a', 1);
      await storage.set('b', 2);
      await storage.set('c', 3);
      const keys = await storage.list();
      expect(keys.sort()).toEqual(['a', 'b', 'c']);
    });

    it('should filter by prefix', async () => {
      await storage.set('doc-1', {});
      await storage.set('doc-2', {});
      await storage.set('chunk-1', {});
      const keys = await storage.list('doc-');
      expect(keys.sort()).toEqual(['doc-1', 'doc-2']);
    });
  });

  describe('clear', () => {
    it('should remove all keys', async () => {
      await storage.set('a', 1);
      await storage.set('b', 2);
      await storage.clear();
      const keys = await storage.list();
      expect(keys).toEqual([]);
    });

    it('should not throw when clearing empty storage', async () => {
      await expect(storage.clear()).resolves.not.toThrow();
    });
  });

  describe('key sanitization', () => {
    it('should handle keys with special characters', async () => {
      await storage.set('path/to/file', 'value');
      const result = await storage.get<string>('path/to/file');
      expect(result).toBe('value');
    });
  });
});
