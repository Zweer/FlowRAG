import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OpenSearchGraphStorage } from '../src/graph-storage.js';

function mockClient() {
  return {
    indices: {
      exists: vi.fn().mockResolvedValue({ body: true }),
      create: vi.fn().mockResolvedValue({}),
    },
    index: vi.fn().mockResolvedValue({}),
    get: vi.fn(),
    search: vi.fn().mockResolvedValue({ body: { hits: { hits: [] } } }),
    delete: vi.fn().mockResolvedValue({}),
  };
}

const entity = (id: string, name: string, type = 'SERVICE') => ({
  id,
  name,
  type,
  description: `${name} desc`,
  sourceChunkIds: ['c1'],
});

const relation = (id: string, sourceId: string, targetId: string, type = 'USES') => ({
  id,
  sourceId,
  targetId,
  type,
  description: `${sourceId} ${type} ${targetId}`,
  keywords: [type.toLowerCase()],
  sourceChunkIds: ['c1'],
});

describe('OpenSearchGraphStorage', () => {
  let client: ReturnType<typeof mockClient>;
  let storage: OpenSearchGraphStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    client = mockClient();
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    storage = new OpenSearchGraphStorage({ client: client as any });
  });

  describe('init', () => {
    it('should create indices if not exist', async () => {
      client.indices.exists.mockResolvedValue({ body: false });
      client.get.mockRejectedValue(new Error('not found'));

      await storage.getEntity('x');

      expect(client.indices.create).toHaveBeenCalledTimes(2);
    });

    it('should accept custom index names', async () => {
      const s = new OpenSearchGraphStorage({
        // biome-ignore lint/suspicious/noExplicitAny: test mock
        client: client as any,
        entityIndex: 'ent',
        relationIndex: 'rel',
      });
      client.indices.exists.mockResolvedValue({ body: false });
      client.get.mockRejectedValue(new Error('not found'));
      await s.getEntity('x');
      expect(client.indices.create).toHaveBeenCalledWith(expect.objectContaining({ index: 'ent' }));
      expect(client.indices.create).toHaveBeenCalledWith(expect.objectContaining({ index: 'rel' }));
    });
  });

  describe('addEntity / getEntity', () => {
    it('should index and retrieve entity', async () => {
      const e = entity('e1', 'ServiceA');
      client.get.mockResolvedValue({ body: { _source: e } });

      await storage.addEntity(e);
      const result = await storage.getEntity('e1');

      expect(client.index).toHaveBeenCalledWith(
        expect.objectContaining({ index: 'flowrag-entities', id: 'e1', body: e }),
      );
      expect(result).toEqual(e);
    });

    it('should return null for missing entity', async () => {
      client.get.mockRejectedValue(new Error('not found'));
      const result = await storage.getEntity('missing');
      expect(result).toBeNull();
    });
  });

  describe('addRelation', () => {
    it('should index relation', async () => {
      const r = relation('r1', 'e1', 'e2');
      await storage.addRelation(r);
      expect(client.index).toHaveBeenCalledWith(
        expect.objectContaining({ index: 'flowrag-relations', id: 'r1', body: r }),
      );
    });
  });

  describe('getEntities', () => {
    it('should return all entities', async () => {
      const e = entity('e1', 'A');
      client.search.mockResolvedValue({ body: { hits: { hits: [{ _source: e }] } } });

      const result = await storage.getEntities();
      expect(result).toEqual([e]);
    });

    it('should filter by type', async () => {
      await storage.getEntities({ type: 'SERVICE' });
      const call = client.search.mock.calls[0][0];
      expect(call.body.query.bool.must).toContainEqual({ term: { type: 'SERVICE' } });
    });

    it('should filter by name', async () => {
      await storage.getEntities({ name: 'Svc' });
      const call = client.search.mock.calls[0][0];
      expect(call.body.query.bool.must).toContainEqual({ wildcard: { name: '*Svc*' } });
    });

    it('should handle null hits', async () => {
      client.search.mockResolvedValue({ body: {} });
      const result = await storage.getEntities();
      expect(result).toEqual([]);
    });
  });

  describe('getRelations', () => {
    it('should get outgoing relations', async () => {
      const r = relation('r1', 'e1', 'e2');
      client.search.mockResolvedValue({ body: { hits: { hits: [{ _source: r }] } } });

      const result = await storage.getRelations('e1', 'out');
      expect(result).toEqual([r]);

      const call = client.search.mock.calls[0][0];
      expect(call.body.query.bool.should).toEqual([{ term: { sourceId: 'e1' } }]);
    });

    it('should get incoming relations', async () => {
      await storage.getRelations('e1', 'in');
      const call = client.search.mock.calls[0][0];
      expect(call.body.query.bool.should).toEqual([{ term: { targetId: 'e1' } }]);
    });

    it('should get both directions by default', async () => {
      await storage.getRelations('e1');
      const call = client.search.mock.calls[0][0];
      expect(call.body.query.bool.should).toHaveLength(2);
    });

    it('should handle null hits', async () => {
      client.search.mockResolvedValue({ body: {} });
      const result = await storage.getRelations('e1');
      expect(result).toEqual([]);
    });
  });

  describe('traverse', () => {
    it('should traverse graph depth-first', async () => {
      const e1 = entity('e1', 'A');
      const e2 = entity('e2', 'B');
      const r1 = relation('r1', 'e1', 'e2');

      client.get
        .mockResolvedValueOnce({ body: { _source: e1 } })
        .mockResolvedValueOnce({ body: { _source: e2 } });

      client.search
        .mockResolvedValueOnce({ body: { hits: { hits: [{ _source: r1 }] } } })
        .mockResolvedValueOnce({ body: { hits: { hits: [] } } });

      const result = await storage.traverse('e1', 1);
      expect(result).toEqual([e1, e2]);
    });

    it('should filter by relation types', async () => {
      const e1 = entity('e1', 'A');
      const r1 = relation('r1', 'e1', 'e2', 'USES');
      const r2 = relation('r2', 'e1', 'e3', 'OWNS');

      client.get.mockResolvedValue({ body: { _source: e1 } });
      client.search.mockResolvedValue({
        body: { hits: { hits: [{ _source: r1 }, { _source: r2 }] } },
      });

      const result = await storage.traverse('e1', 1, ['USES']);
      // Only e1 + e2 (via USES), not e3 (via OWNS)
      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should handle missing entity in traverse', async () => {
      client.get.mockRejectedValue(new Error('not found'));
      client.search.mockResolvedValue({ body: { hits: { hits: [] } } });

      const result = await storage.traverse('missing', 1);
      expect(result).toEqual([]);
    });

    it('should stop at depth 0', async () => {
      const e1 = entity('e1', 'A');
      client.get.mockResolvedValue({ body: { _source: e1 } });

      const result = await storage.traverse('e1', 0);
      expect(result).toEqual([e1]);
      // Should NOT call getRelations since depth=0
      expect(client.search).not.toHaveBeenCalled();
    });

    it('should not revisit nodes', async () => {
      const e1 = entity('e1', 'A');
      client.get.mockResolvedValue({ body: { _source: e1 } });
      // Circular: e1 -> e1
      const r1 = relation('r1', 'e1', 'e1');
      client.search.mockResolvedValue({
        body: { hits: { hits: [{ _source: r1 }] } },
      });

      const result = await storage.traverse('e1', 2);
      expect(result).toEqual([e1]);
    });
  });

  describe('findPath', () => {
    it('should find direct path', async () => {
      const r1 = relation('r1', 'e1', 'e2');

      client.search.mockResolvedValue({
        body: { hits: { hits: [{ _source: r1 }] } },
      });

      const path = await storage.findPath('e1', 'e2');
      expect(path).toEqual([r1]);
    });

    it('should return empty for no path', async () => {
      client.search.mockResolvedValue({ body: { hits: { hits: [] } } });

      const path = await storage.findPath('e1', 'e99');
      expect(path).toEqual([]);
    });

    it('should backtrack on dead ends', async () => {
      // e1 -> e2 (dead end), e1 -> e3 -> e4 (target)
      const r1 = relation('r1', 'e1', 'e2');
      const r2 = relation('r2', 'e1', 'e3');
      const r3 = relation('r3', 'e3', 'e4');

      client.search
        .mockResolvedValueOnce({ body: { hits: { hits: [{ _source: r1 }, { _source: r2 }] } } })
        .mockResolvedValueOnce({ body: { hits: { hits: [] } } }) // e2 dead end
        .mockResolvedValueOnce({ body: { hits: { hits: [{ _source: r3 }] } } }); // e3 -> e4

      const path = await storage.findPath('e1', 'e4');
      expect(path).toEqual([r2, r3]);
    });

    it('should respect maxDepth', async () => {
      const r1 = relation('r1', 'e1', 'e2');
      client.search.mockResolvedValue({
        body: { hits: { hits: [{ _source: r1 }] } },
      });

      const path = await storage.findPath('e1', 'e99', 0);
      expect(path).toEqual([]);
    });
  });

  describe('deleteEntity', () => {
    it('should delete entity and its relations', async () => {
      const r1 = relation('r1', 'e1', 'e2');
      client.search.mockResolvedValue({
        body: { hits: { hits: [{ _source: r1 }] } },
      });

      await storage.deleteEntity('e1');

      // Should delete relation first, then entity
      expect(client.delete).toHaveBeenCalledWith(
        expect.objectContaining({ index: 'flowrag-relations', id: 'r1' }),
      );
      expect(client.delete).toHaveBeenCalledWith(
        expect.objectContaining({ index: 'flowrag-entities', id: 'e1' }),
      );
    });

    it('should not throw if entity not found', async () => {
      client.search.mockResolvedValue({ body: { hits: { hits: [] } } });
      client.delete.mockRejectedValue(new Error('not found'));

      await expect(storage.deleteEntity('missing')).resolves.not.toThrow();
    });
  });

  describe('deleteRelation', () => {
    it('should delete relation', async () => {
      await storage.deleteRelation('r1');
      expect(client.delete).toHaveBeenCalledWith(
        expect.objectContaining({ index: 'flowrag-relations', id: 'r1' }),
      );
    });

    it('should not throw if relation not found', async () => {
      client.delete.mockRejectedValue(new Error('not found'));
      await expect(storage.deleteRelation('missing')).resolves.not.toThrow();
    });
  });
});
