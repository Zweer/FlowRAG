import { describe, expect, it, vi } from 'vitest';

import type { GraphStorage, KVStorage, VectorStorage } from '../src/interfaces/storage.js';
import { withNamespace } from '../src/namespace.js';

function mockKV(): KVStorage {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue([]),
    clear: vi.fn().mockResolvedValue(undefined),
  };
}

function mockVector(): VectorStorage {
  return {
    upsert: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
    count: vi.fn().mockResolvedValue(42),
  };
}

function mockGraph(): GraphStorage {
  return {
    addEntity: vi.fn().mockResolvedValue(undefined),
    addRelation: vi.fn().mockResolvedValue(undefined),
    getEntity: vi.fn().mockResolvedValue(null),
    getEntities: vi.fn().mockResolvedValue([]),
    getRelations: vi.fn().mockResolvedValue([]),
    traverse: vi.fn().mockResolvedValue([]),
    findPath: vi.fn().mockResolvedValue([]),
    deleteEntity: vi.fn().mockResolvedValue(undefined),
    deleteRelation: vi.fn().mockResolvedValue(undefined),
  };
}

const entity = (id: string) => ({
  id,
  name: 'E',
  type: 'SERVICE',
  description: 'd',
  sourceChunkIds: ['c1'],
});

const relation = (id: string) => ({
  id,
  sourceId: 'e1',
  targetId: 'e2',
  type: 'USES',
  description: 'd',
  keywords: ['k'],
  sourceChunkIds: ['c1'],
});

describe('withNamespace', () => {
  const NS = 'tenant-a';

  describe('KV', () => {
    it('prefixes get/set/delete keys', async () => {
      const inner = mockKV();
      const { kv } = withNamespace({ kv: inner, vector: mockVector(), graph: mockGraph() }, NS);

      await kv.get('key1');
      expect(inner.get).toHaveBeenCalledWith('tenant-a:key1');

      await kv.set('key1', { v: 1 });
      expect(inner.set).toHaveBeenCalledWith('tenant-a:key1', { v: 1 });

      await kv.delete('key1');
      expect(inner.delete).toHaveBeenCalledWith('tenant-a:key1');
    });

    it('list strips namespace prefix', async () => {
      const inner = mockKV();
      (inner.list as ReturnType<typeof vi.fn>).mockResolvedValue([
        'tenant-a:doc:1',
        'tenant-a:doc:2',
      ]);
      const { kv } = withNamespace({ kv: inner, vector: mockVector(), graph: mockGraph() }, NS);

      const keys = await kv.list('doc:');
      expect(inner.list).toHaveBeenCalledWith('tenant-a:doc:');
      expect(keys).toEqual(['doc:1', 'doc:2']);
    });

    it('list with no prefix uses namespace only', async () => {
      const inner = mockKV();
      (inner.list as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      const { kv } = withNamespace({ kv: inner, vector: mockVector(), graph: mockGraph() }, NS);

      await kv.list();
      expect(inner.list).toHaveBeenCalledWith('tenant-a:');
    });

    it('clear deletes only namespaced keys', async () => {
      const inner = mockKV();
      (inner.list as ReturnType<typeof vi.fn>).mockResolvedValue(['tenant-a:k1', 'tenant-a:k2']);
      const { kv } = withNamespace({ kv: inner, vector: mockVector(), graph: mockGraph() }, NS);

      await kv.clear();
      expect(inner.list).toHaveBeenCalledWith('tenant-a:');
      expect(inner.delete).toHaveBeenCalledWith('tenant-a:k1');
      expect(inner.delete).toHaveBeenCalledWith('tenant-a:k2');
    });
  });

  describe('Vector', () => {
    it('upsert prefixes IDs and adds __ns metadata', async () => {
      const inner = mockVector();
      const { vector } = withNamespace({ kv: mockKV(), vector: inner, graph: mockGraph() }, NS);

      await vector.upsert([{ id: 'v1', vector: [0.1], metadata: { tag: 'x' } }]);
      expect(inner.upsert).toHaveBeenCalledWith([
        { id: 'tenant-a:v1', vector: [0.1], metadata: { tag: 'x', __ns: 'tenant-a' } },
      ]);
    });

    it('search adds __ns filter and strips namespace from results', async () => {
      const inner = mockVector();
      (inner.search as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'tenant-a:v1', score: 0.9, metadata: { tag: 'x', __ns: 'tenant-a' } },
      ]);
      const { vector } = withNamespace({ kv: mockKV(), vector: inner, graph: mockGraph() }, NS);

      const results = await vector.search([0.1], 5, { tag: 'x' });
      expect(inner.search).toHaveBeenCalledWith([0.1], 5, { tag: 'x', __ns: 'tenant-a' });
      expect(results).toEqual([{ id: 'v1', score: 0.9, metadata: { tag: 'x', __ns: undefined } }]);
    });

    it('search works without filter', async () => {
      const inner = mockVector();
      (inner.search as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      const { vector } = withNamespace({ kv: mockKV(), vector: inner, graph: mockGraph() }, NS);

      await vector.search([0.1], 5);
      expect(inner.search).toHaveBeenCalledWith([0.1], 5, { __ns: 'tenant-a' });
    });

    it('delete prefixes IDs', async () => {
      const inner = mockVector();
      const { vector } = withNamespace({ kv: mockKV(), vector: inner, graph: mockGraph() }, NS);

      await vector.delete(['v1', 'v2']);
      expect(inner.delete).toHaveBeenCalledWith(['tenant-a:v1', 'tenant-a:v2']);
    });

    it('count delegates to inner', async () => {
      const inner = mockVector();
      const { vector } = withNamespace({ kv: mockKV(), vector: inner, graph: mockGraph() }, NS);

      expect(await vector.count()).toBe(42);
    });
  });

  describe('Graph', () => {
    it('addEntity prefixes id and sourceChunkIds', async () => {
      const inner = mockGraph();
      const { graph } = withNamespace({ kv: mockKV(), vector: mockVector(), graph: inner }, NS);

      await graph.addEntity(entity('e1'));
      expect(inner.addEntity).toHaveBeenCalledWith({
        ...entity('tenant-a:e1'),
        sourceChunkIds: ['tenant-a:c1'],
      });
    });

    it('addRelation prefixes all IDs', async () => {
      const inner = mockGraph();
      const { graph } = withNamespace({ kv: mockKV(), vector: mockVector(), graph: inner }, NS);

      await graph.addRelation(relation('r1'));
      expect(inner.addRelation).toHaveBeenCalledWith({
        ...relation('r1'),
        id: 'tenant-a:r1',
        sourceId: 'tenant-a:e1',
        targetId: 'tenant-a:e2',
        sourceChunkIds: ['tenant-a:c1'],
      });
    });

    it('getEntity prefixes id and unprefixes result', async () => {
      const inner = mockGraph();
      (inner.getEntity as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...entity('tenant-a:e1'),
        sourceChunkIds: ['tenant-a:c1'],
      });
      const { graph } = withNamespace({ kv: mockKV(), vector: mockVector(), graph: inner }, NS);

      const e = await graph.getEntity('e1');
      expect(inner.getEntity).toHaveBeenCalledWith('tenant-a:e1');
      expect(e?.id).toBe('e1');
      expect(e?.sourceChunkIds).toEqual(['c1']);
    });

    it('getEntity returns null when not found', async () => {
      const inner = mockGraph();
      const { graph } = withNamespace({ kv: mockKV(), vector: mockVector(), graph: inner }, NS);

      expect(await graph.getEntity('missing')).toBeNull();
    });

    it('getEntities filters by namespace and unprefixes', async () => {
      const inner = mockGraph();
      (inner.getEntities as ReturnType<typeof vi.fn>).mockResolvedValue([
        { ...entity('tenant-a:e1'), sourceChunkIds: ['tenant-a:c1'] },
        { ...entity('tenant-b:e2'), sourceChunkIds: ['tenant-b:c1'] },
      ]);
      const { graph } = withNamespace({ kv: mockKV(), vector: mockVector(), graph: inner }, NS);

      const entities = await graph.getEntities({ type: 'SERVICE' });
      expect(entities).toHaveLength(1);
      expect(entities[0].id).toBe('e1');
    });

    it('getRelations prefixes entityId and unprefixes results', async () => {
      const inner = mockGraph();
      (inner.getRelations as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          ...relation('tenant-a:r1'),
          sourceId: 'tenant-a:e1',
          targetId: 'tenant-a:e2',
          sourceChunkIds: ['tenant-a:c1'],
        },
      ]);
      const { graph } = withNamespace({ kv: mockKV(), vector: mockVector(), graph: inner }, NS);

      const rels = await graph.getRelations('e1', 'out');
      expect(inner.getRelations).toHaveBeenCalledWith('tenant-a:e1', 'out');
      expect(rels[0].id).toBe('r1');
      expect(rels[0].sourceId).toBe('e1');
      expect(rels[0].targetId).toBe('e2');
    });

    it('traverse prefixes startId and unprefixes results', async () => {
      const inner = mockGraph();
      (inner.traverse as ReturnType<typeof vi.fn>).mockResolvedValue([
        { ...entity('tenant-a:e2'), sourceChunkIds: ['tenant-a:c1'] },
      ]);
      const { graph } = withNamespace({ kv: mockKV(), vector: mockVector(), graph: inner }, NS);

      const entities = await graph.traverse('e1', 2, ['USES']);
      expect(inner.traverse).toHaveBeenCalledWith('tenant-a:e1', 2, ['USES']);
      expect(entities[0].id).toBe('e2');
    });

    it('findPath prefixes both IDs and unprefixes results', async () => {
      const inner = mockGraph();
      (inner.findPath as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          ...relation('tenant-a:r1'),
          sourceId: 'tenant-a:e1',
          targetId: 'tenant-a:e2',
          sourceChunkIds: ['tenant-a:c1'],
        },
      ]);
      const { graph } = withNamespace({ kv: mockKV(), vector: mockVector(), graph: inner }, NS);

      const rels = await graph.findPath('e1', 'e2', 3);
      expect(inner.findPath).toHaveBeenCalledWith('tenant-a:e1', 'tenant-a:e2', 3);
      expect(rels[0].sourceId).toBe('e1');
    });

    it('deleteEntity/deleteRelation prefix IDs', async () => {
      const inner = mockGraph();
      const { graph } = withNamespace({ kv: mockKV(), vector: mockVector(), graph: inner }, NS);

      await graph.deleteEntity('e1');
      expect(inner.deleteEntity).toHaveBeenCalledWith('tenant-a:e1');

      await graph.deleteRelation('r1');
      expect(inner.deleteRelation).toHaveBeenCalledWith('tenant-a:r1');
    });
  });
});
