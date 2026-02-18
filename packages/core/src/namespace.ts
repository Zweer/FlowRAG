/**
 * Multi-tenancy namespace wrappers for storage isolation.
 */

import type { GraphStorage, KVStorage, VectorStorage } from './interfaces/storage.js';
import type {
  Entity,
  EntityFilter,
  Id,
  Relation,
  RelationDirection,
  SearchResult,
  VectorFilter,
  VectorRecord,
} from './types.js';

function pfx(ns: string, id: string): string {
  return `${ns}:${id}`;
}

function unpfx(ns: string, id: string): string {
  return id.slice(ns.length + 1);
}

class NamespacedKVStorage implements KVStorage {
  constructor(
    private inner: KVStorage,
    private ns: string,
  ) {}

  get<T>(key: string): Promise<T | null> {
    return this.inner.get<T>(pfx(this.ns, key));
  }

  set<T>(key: string, value: T): Promise<void> {
    return this.inner.set(pfx(this.ns, key), value);
  }

  delete(key: string): Promise<void> {
    return this.inner.delete(pfx(this.ns, key));
  }

  async list(prefix?: string): Promise<string[]> {
    const keys = await this.inner.list(pfx(this.ns, prefix ?? ''));
    return keys.map((k) => unpfx(this.ns, k));
  }

  async clear(): Promise<void> {
    const keys = await this.inner.list(`${this.ns}:`);
    await Promise.all(keys.map((k) => this.inner.delete(k)));
  }
}

class NamespacedVectorStorage implements VectorStorage {
  constructor(
    private inner: VectorStorage,
    private ns: string,
  ) {}

  upsert(records: VectorRecord[]): Promise<void> {
    return this.inner.upsert(
      records.map((r) => ({
        ...r,
        id: pfx(this.ns, r.id),
        metadata: { ...r.metadata, __ns: this.ns },
      })),
    );
  }

  async search(vector: number[], limit: number, filter?: VectorFilter): Promise<SearchResult[]> {
    const results = await this.inner.search(vector, limit, { ...filter, __ns: this.ns });
    return results.map((r) => ({
      ...r,
      id: unpfx(this.ns, r.id),
      metadata: { ...r.metadata, __ns: undefined },
    }));
  }

  delete(ids: Id[]): Promise<void> {
    return this.inner.delete(ids.map((id) => pfx(this.ns, id)));
  }

  count(): Promise<number> {
    return this.inner.count();
  }
}

class NamespacedGraphStorage implements GraphStorage {
  constructor(
    private inner: GraphStorage,
    private ns: string,
  ) {}

  addEntity(entity: Entity): Promise<void> {
    return this.inner.addEntity({
      ...entity,
      id: pfx(this.ns, entity.id),
      sourceChunkIds: entity.sourceChunkIds.map((id) => pfx(this.ns, id)),
    });
  }

  addRelation(relation: Relation): Promise<void> {
    return this.inner.addRelation({
      ...relation,
      id: pfx(this.ns, relation.id),
      sourceId: pfx(this.ns, relation.sourceId),
      targetId: pfx(this.ns, relation.targetId),
      sourceChunkIds: relation.sourceChunkIds.map((id) => pfx(this.ns, id)),
    });
  }

  async getEntity(id: Id): Promise<Entity | null> {
    const e = await this.inner.getEntity(pfx(this.ns, id));
    return e ? this.unpfxEntity(e) : null;
  }

  async getEntities(filter?: EntityFilter): Promise<Entity[]> {
    const all = await this.inner.getEntities(filter);
    return all.filter((e) => e.id.startsWith(`${this.ns}:`)).map((e) => this.unpfxEntity(e));
  }

  async getRelations(entityId: Id, direction?: RelationDirection): Promise<Relation[]> {
    const rels = await this.inner.getRelations(pfx(this.ns, entityId), direction);
    return rels.map((r) => this.unpfxRelation(r));
  }

  async traverse(startId: Id, depth: number, relationTypes?: string[]): Promise<Entity[]> {
    const entities = await this.inner.traverse(pfx(this.ns, startId), depth, relationTypes);
    return entities.map((e) => this.unpfxEntity(e));
  }

  async findPath(fromId: Id, toId: Id, maxDepth?: number): Promise<Relation[]> {
    const rels = await this.inner.findPath(pfx(this.ns, fromId), pfx(this.ns, toId), maxDepth);
    return rels.map((r) => this.unpfxRelation(r));
  }

  deleteEntity(id: Id): Promise<void> {
    return this.inner.deleteEntity(pfx(this.ns, id));
  }

  deleteRelation(id: Id): Promise<void> {
    return this.inner.deleteRelation(pfx(this.ns, id));
  }

  private unpfxEntity(e: Entity): Entity {
    return {
      ...e,
      id: unpfx(this.ns, e.id),
      sourceChunkIds: e.sourceChunkIds.map((id) => unpfx(this.ns, id)),
    };
  }

  private unpfxRelation(r: Relation): Relation {
    return {
      ...r,
      id: unpfx(this.ns, r.id),
      sourceId: unpfx(this.ns, r.sourceId),
      targetId: unpfx(this.ns, r.targetId),
      sourceChunkIds: r.sourceChunkIds.map((id) => unpfx(this.ns, id)),
    };
  }
}

/** Storage set for FlowRAG */
export interface StorageSet {
  kv: KVStorage;
  vector: VectorStorage;
  graph: GraphStorage;
}

/** Wrap storage with namespace isolation for multi-tenancy. */
export function withNamespace(storage: StorageSet, namespace: string): StorageSet {
  return {
    kv: new NamespacedKVStorage(storage.kv, namespace),
    vector: new NamespacedVectorStorage(storage.vector, namespace),
    graph: new NamespacedGraphStorage(storage.graph, namespace),
  };
}
