/**
 * Storage interfaces for FlowRAG
 */

import type {
  Entity,
  EntityFilter,
  Id,
  Relation,
  RelationDirection,
  SearchResult,
  VectorFilter,
  VectorRecord,
} from '../types.js';

/** KV Storage - for documents, chunks, and cache */
export interface KVStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
  clear(): Promise<void>;
}

/** Vector Storage - for embeddings and semantic search */
export interface VectorStorage {
  upsert(records: VectorRecord[]): Promise<void>;
  search(vector: number[], limit: number, filter?: VectorFilter): Promise<SearchResult[]>;
  delete(ids: Id[]): Promise<void>;
  count(): Promise<number>;
}

/** Graph Storage - for entities and relations */
export interface GraphStorage {
  addEntity(entity: Entity): Promise<void>;
  addRelation(relation: Relation): Promise<void>;
  getEntity(id: Id): Promise<Entity | null>;
  getEntities(filter?: EntityFilter): Promise<Entity[]>;
  getRelations(entityId: Id, direction?: RelationDirection): Promise<Relation[]>;
  traverse(startId: Id, depth: number, relationTypes?: string[]): Promise<Entity[]>;
  findPath(fromId: Id, toId: Id, maxDepth?: number): Promise<Relation[]>;
  deleteEntity(id: Id): Promise<void>;
  deleteRelation(id: Id): Promise<void>;
}
