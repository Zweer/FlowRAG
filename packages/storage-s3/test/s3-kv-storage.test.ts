import { beforeEach, describe, expect, it, vi } from 'vitest';

import { S3KVStorage } from '../src/s3-kv-storage.js';

const mockSend = vi.fn();

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send = mockSend;
  },
  GetObjectCommand: class {
    constructor(public input: unknown) {}
  },
  PutObjectCommand: class {
    constructor(public input: unknown) {}
  },
  DeleteObjectCommand: class {
    constructor(public input: unknown) {}
  },
  ListObjectsV2Command: class {
    constructor(public input: unknown) {}
  },
}));

describe('S3KVStorage', () => {
  let storage: S3KVStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new S3KVStorage({ bucket: 'test-bucket', prefix: 'data/' });
  });

  describe('constructor', () => {
    it('should use empty prefix by default', async () => {
      const s = new S3KVStorage({ bucket: 'b' });
      mockSend.mockRejectedValue(new Error('not found'));
      await expect(s.get('key')).resolves.toBeNull();
    });

    it('should accept custom region', () => {
      const s = new S3KVStorage({ bucket: 'b', region: 'eu-central-1' });
      expect(s).toBeDefined();
    });
  });

  describe('get', () => {
    it('should return parsed JSON value', async () => {
      mockSend.mockResolvedValue({
        Body: { transformToString: () => Promise.resolve(JSON.stringify({ name: 'test' })) },
      });

      const result = await storage.get<{ name: string }>('key1');
      expect(result).toEqual({ name: 'test' });
    });

    it('should return null for non-existent key', async () => {
      mockSend.mockRejectedValue(new Error('NoSuchKey'));

      const result = await storage.get('missing');
      expect(result).toBeNull();
    });

    it('should return null when body is empty', async () => {
      mockSend.mockResolvedValue({ Body: undefined });

      const result = await storage.get('empty');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should put object with JSON body', async () => {
      mockSend.mockResolvedValue({});

      await storage.set('key1', { value: 42 });

      const cmd = mockSend.mock.calls[0][0];
      expect(cmd.input).toEqual({
        Bucket: 'test-bucket',
        Key: 'data/key1.json',
        Body: JSON.stringify({ value: 42 }),
        ContentType: 'application/json',
      });
    });
  });

  describe('delete', () => {
    it('should delete object', async () => {
      mockSend.mockResolvedValue({});

      await storage.delete('key1');

      const cmd = mockSend.mock.calls[0][0];
      expect(cmd.input).toEqual({
        Bucket: 'test-bucket',
        Key: 'data/key1.json',
      });
    });
  });

  describe('list', () => {
    it('should list all keys', async () => {
      mockSend.mockResolvedValue({
        Contents: [{ Key: 'data/doc-1.json' }, { Key: 'data/doc-2.json' }],
        IsTruncated: false,
      });

      const keys = await storage.list();
      expect(keys).toEqual(['doc-1', 'doc-2']);
    });

    it('should filter by prefix', async () => {
      mockSend.mockResolvedValue({
        Contents: [{ Key: 'data/doc-1.json' }, { Key: 'data/chunk-1.json' }],
        IsTruncated: false,
      });

      const keys = await storage.list('doc-');
      expect(keys).toEqual(['doc-1']);
    });

    it('should handle pagination', async () => {
      mockSend
        .mockResolvedValueOnce({
          Contents: [{ Key: 'data/a.json' }],
          IsTruncated: true,
          NextContinuationToken: 'token1',
        })
        .mockResolvedValueOnce({
          Contents: [{ Key: 'data/b.json' }],
          IsTruncated: false,
        });

      const keys = await storage.list();
      expect(keys).toEqual(['a', 'b']);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should handle empty bucket', async () => {
      mockSend.mockResolvedValue({ IsTruncated: false });

      const keys = await storage.list();
      expect(keys).toEqual([]);
    });

    it('should skip objects without Key', async () => {
      mockSend.mockResolvedValue({
        Contents: [{ Key: 'data/a.json' }, {}],
        IsTruncated: false,
      });

      const keys = await storage.list();
      expect(keys).toEqual(['a']);
    });
  });

  describe('clear', () => {
    it('should delete all objects', async () => {
      mockSend
        .mockResolvedValueOnce({
          Contents: [{ Key: 'data/a.json' }, { Key: 'data/b.json' }],
          IsTruncated: false,
        })
        .mockResolvedValue({});

      await storage.clear();

      // 1 list + 2 deletes
      expect(mockSend).toHaveBeenCalledTimes(3);
    });
  });

  describe('key sanitization', () => {
    it('should sanitize path separators', async () => {
      mockSend.mockResolvedValue({});

      await storage.set('path/to/file', 'value');

      const cmd = mockSend.mock.calls[0][0];
      expect(cmd.input.Key).toBe('data/path_to_file.json');
    });
  });
});
