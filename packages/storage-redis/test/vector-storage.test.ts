import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RedisVectorStorage } from '../src/vector-storage.js';

const mockHSet = vi.fn();
const mockDel = vi.fn();
const mockFtCreate = vi.fn();
const mockFtSearch = vi.fn();
const mockFtInfo = vi.fn();

const mockClient = {
  hSet: mockHSet,
  del: mockDel,
  ft: {
    create: mockFtCreate,
    search: mockFtSearch,
    info: mockFtInfo,
  },
  // biome-ignore lint/suspicious/noExplicitAny: mock
} as any;

describe('RedisVectorStorage', () => {
  let storage: RedisVectorStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new RedisVectorStorage({ client: mockClient, dimensions: 3 });
  });

  it('should accept custom options', () => {
    const s = new RedisVectorStorage({
      client: mockClient,
      dimensions: 768,
      index: 'custom-idx',
      prefix: 'custom:',
    });
    expect(s).toBeDefined();
  });

  describe('init', () => {
    it('should create index if not exists', async () => {
      mockFtInfo.mockRejectedValueOnce(new Error('Unknown index'));
      mockFtCreate.mockResolvedValue('OK');
      mockFtInfo.mockResolvedValue({ numDocs: 0 });

      await storage.count();

      expect(mockFtCreate).toHaveBeenCalledWith(
        'flowrag-vectors',
        expect.objectContaining({
          embedding: expect.objectContaining({ DIM: 3 }),
        }),
        expect.objectContaining({ ON: 'HASH', PREFIX: 'flowrag:vec:' }),
      );
    });

    it('should skip creation if index exists', async () => {
      mockFtInfo.mockResolvedValue({ numDocs: 5 });

      await storage.count();

      expect(mockFtCreate).not.toHaveBeenCalled();
    });

    it('should only init once', async () => {
      mockFtInfo.mockResolvedValue({ numDocs: 0 });

      await storage.count();
      await storage.count();

      // ft.info called once for init + once per count() call = 3 total
      // but ft.create should never be called (index exists)
      expect(mockFtCreate).not.toHaveBeenCalled();
    });
  });

  describe('upsert', () => {
    it('should store vectors as hash', async () => {
      mockFtInfo.mockResolvedValue({ numDocs: 0 });

      await storage.upsert([{ id: 'v1', vector: [0.1, 0.2, 0.3], metadata: { content: 'test' } }]);

      expect(mockHSet).toHaveBeenCalledWith('flowrag:vec:v1', {
        embedding: expect.any(Buffer),
        metadata: '{"content":"test"}',
      });
    });

    it('should handle empty records', async () => {
      await storage.upsert([]);
      expect(mockHSet).not.toHaveBeenCalled();
    });

    it('should handle missing metadata', async () => {
      mockFtInfo.mockResolvedValue({ numDocs: 0 });

      await storage.upsert([{ id: 'v1', vector: [0.1, 0.2, 0.3], metadata: {} }]);

      expect(mockHSet).toHaveBeenCalledWith('flowrag:vec:v1', {
        embedding: expect.any(Buffer),
        metadata: '{}',
      });
    });
  });

  describe('search', () => {
    it('should return scored results', async () => {
      mockFtInfo.mockResolvedValue({ numDocs: 1 });
      mockFtSearch.mockResolvedValue({
        documents: [
          { id: 'flowrag:vec:v1', value: { score: '0.2', metadata: '{"content":"test"}' } },
        ],
      });

      const results = await storage.search([0.1, 0.2, 0.3], 5);

      expect(results).toEqual([{ id: 'v1', score: 0.8, metadata: { content: 'test' } }]);
      expect(mockFtSearch).toHaveBeenCalledWith(
        'flowrag-vectors',
        '*=>[KNN 5 @embedding $B AS score]',
        expect.objectContaining({ DIALECT: 2 }),
      );
    });

    it('should handle missing score and metadata', async () => {
      mockFtInfo.mockResolvedValue({ numDocs: 1 });
      mockFtSearch.mockResolvedValue({
        documents: [{ id: 'flowrag:vec:v1', value: {} }],
      });

      const results = await storage.search([0.1], 1);
      expect(results).toEqual([{ id: 'v1', score: 1, metadata: {} }]);
    });
  });

  describe('delete', () => {
    it('should delete keys', async () => {
      await storage.delete(['v1', 'v2']);
      expect(mockDel).toHaveBeenCalledWith(['flowrag:vec:v1', 'flowrag:vec:v2']);
    });

    it('should skip empty ids', async () => {
      await storage.delete([]);
      expect(mockDel).not.toHaveBeenCalled();
    });
  });

  describe('count', () => {
    it('should return numDocs from index info', async () => {
      mockFtInfo.mockResolvedValue({ numDocs: 42 });
      expect(await storage.count()).toBe(42);
    });
  });
});
