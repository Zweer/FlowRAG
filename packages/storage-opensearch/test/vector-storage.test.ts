import type { Client } from '@opensearch-project/opensearch';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OpenSearchVectorStorage } from '../src/vector-storage.js';

function mockClient() {
  return {
    indices: {
      exists: vi.fn().mockResolvedValue({ body: true }),
      create: vi.fn().mockResolvedValue({}),
    },
    bulk: vi.fn().mockResolvedValue({}),
    search: vi.fn().mockResolvedValue({ body: { hits: { hits: [] } } }),
    count: vi.fn().mockResolvedValue({ body: { count: 0 } }),
  };
}

describe('OpenSearchVectorStorage', () => {
  let client: ReturnType<typeof mockClient>;
  let storage: OpenSearchVectorStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    client = mockClient();
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    storage = new OpenSearchVectorStorage({ client: client as any, dimensions: 384 });
  });

  describe('init', () => {
    it('should create index if not exists', async () => {
      client.indices.exists.mockResolvedValue({ body: false });

      await storage.count();

      expect(client.indices.create).toHaveBeenCalledWith(
        expect.objectContaining({ index: 'flowrag-vectors' }),
      );
    });

    it('should skip creation if index exists', async () => {
      await storage.count();
      expect(client.indices.create).not.toHaveBeenCalled();
    });

    it('should not re-check after first init', async () => {
      await storage.count();
      await storage.count();
      expect(client.indices.exists).toHaveBeenCalledTimes(1);
    });

    it('should accept custom index name', async () => {
      const s = new OpenSearchVectorStorage({
        client: client as unknown as Client,
        dimensions: 384,
        index: 'custom',
      });
      client.indices.exists.mockResolvedValue({ body: false });
      await s.count();
      expect(client.indices.create).toHaveBeenCalledWith(
        expect.objectContaining({ index: 'custom' }),
      );
    });
  });

  describe('upsert', () => {
    it('should bulk index records', async () => {
      await storage.upsert([{ id: 'v1', vector: [0.1, 0.2], metadata: { type: 'chunk' } }]);

      expect(client.bulk).toHaveBeenCalledWith({
        body: [
          { index: { _index: 'flowrag-vectors', _id: 'v1' } },
          { vector: [0.1, 0.2], metadata: { type: 'chunk' } },
        ],
        refresh: true,
      });
    });

    it('should skip empty records', async () => {
      await storage.upsert([]);
      expect(client.bulk).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('should return k-NN results', async () => {
      client.search.mockResolvedValue({
        body: {
          hits: {
            hits: [{ _id: 'v1', _score: 0.95, _source: { metadata: { type: 'chunk' } } }],
          },
        },
      });

      const results = await storage.search([0.1, 0.2], 5);

      expect(results).toEqual([{ id: 'v1', score: 0.95, metadata: { type: 'chunk' } }]);
    });

    it('should handle empty results', async () => {
      const results = await storage.search([0.1], 5);
      expect(results).toEqual([]);
    });

    it('should handle null hits', async () => {
      client.search.mockResolvedValue({ body: {} });
      const results = await storage.search([0.1], 5);
      expect(results).toEqual([]);
    });

    it('should handle missing score and source', async () => {
      client.search.mockResolvedValue({
        body: { hits: { hits: [{ _id: 'v1' }] } },
      });

      const results = await storage.search([0.1], 5);
      expect(results).toEqual([{ id: 'v1', score: 0, metadata: {} }]);
    });
  });

  describe('delete', () => {
    it('should bulk delete by IDs', async () => {
      await storage.delete(['v1', 'v2']);

      expect(client.bulk).toHaveBeenCalledWith({
        body: [
          { delete: { _index: 'flowrag-vectors', _id: 'v1' } },
          { delete: { _index: 'flowrag-vectors', _id: 'v2' } },
        ],
        refresh: true,
      });
    });

    it('should skip empty IDs', async () => {
      await storage.delete([]);
      expect(client.bulk).not.toHaveBeenCalled();
    });
  });

  describe('count', () => {
    it('should return document count', async () => {
      client.count.mockResolvedValue({ body: { count: 42 } });

      const result = await storage.count();
      expect(result).toBe(42);
    });
  });
});
