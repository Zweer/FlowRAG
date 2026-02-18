import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RedisKVStorage } from '../src/kv-storage.js';

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDel = vi.fn();
const mockKeys = vi.fn();

const mockClient = {
  get: mockGet,
  set: mockSet,
  del: mockDel,
  keys: mockKeys,
  // biome-ignore lint/suspicious/noExplicitAny: mock
} as any;

describe('RedisKVStorage', () => {
  let storage: RedisKVStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new RedisKVStorage({ client: mockClient });
  });

  it('should use default prefix', () => {
    expect(storage).toBeDefined();
  });

  it('should accept custom prefix', () => {
    const s = new RedisKVStorage({ client: mockClient, prefix: 'custom:' });
    expect(s).toBeDefined();
  });

  describe('get', () => {
    it('should return parsed value', async () => {
      mockGet.mockResolvedValue(JSON.stringify({ name: 'test' }));
      const result = await storage.get('key1');
      expect(result).toEqual({ name: 'test' });
      expect(mockGet).toHaveBeenCalledWith('flowrag:kv:key1');
    });

    it('should return null for missing key', async () => {
      mockGet.mockResolvedValue(null);
      expect(await storage.get('missing')).toBeNull();
    });
  });

  describe('set', () => {
    it('should store JSON string', async () => {
      await storage.set('key1', { name: 'test' });
      expect(mockSet).toHaveBeenCalledWith('flowrag:kv:key1', '{"name":"test"}');
    });
  });

  describe('delete', () => {
    it('should delete key', async () => {
      await storage.delete('key1');
      expect(mockDel).toHaveBeenCalledWith('flowrag:kv:key1');
    });
  });

  describe('list', () => {
    it('should list all keys', async () => {
      mockKeys.mockResolvedValue(['flowrag:kv:a', 'flowrag:kv:b']);
      const keys = await storage.list();
      expect(keys).toEqual(['a', 'b']);
      expect(mockKeys).toHaveBeenCalledWith('flowrag:kv:*');
    });

    it('should filter by prefix', async () => {
      mockKeys.mockResolvedValue(['flowrag:kv:doc:1', 'flowrag:kv:doc:2']);
      const keys = await storage.list('doc:');
      expect(keys).toEqual(['doc:1', 'doc:2']);
      expect(mockKeys).toHaveBeenCalledWith('flowrag:kv:doc:*');
    });
  });

  describe('clear', () => {
    it('should delete all keys', async () => {
      mockKeys.mockResolvedValue(['flowrag:kv:a', 'flowrag:kv:b']);
      await storage.clear();
      expect(mockDel).toHaveBeenCalledWith(['flowrag:kv:a', 'flowrag:kv:b']);
    });

    it('should skip del when no keys', async () => {
      mockKeys.mockResolvedValue([]);
      await storage.clear();
      expect(mockDel).not.toHaveBeenCalled();
    });
  });
});
