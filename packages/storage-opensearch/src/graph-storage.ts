import type {
  Entity,
  EntityFilter,
  GraphStorage,
  Id,
  Relation,
  RelationDirection,
} from '@flowrag/core';
import type { Client } from '@opensearch-project/opensearch';

export interface OpenSearchGraphStorageOptions {
  client: Client;
  entityIndex?: string;
  relationIndex?: string;
}

export class OpenSearchGraphStorage implements GraphStorage {
  private readonly client: Client;
  private readonly entityIndex: string;
  private readonly relationIndex: string;
  private initialized = false;

  constructor(options: OpenSearchGraphStorageOptions) {
    this.client = options.client;
    this.entityIndex = options.entityIndex ?? 'flowrag-entities';
    this.relationIndex = options.relationIndex ?? 'flowrag-relations';
  }

  private async init(): Promise<void> {
    if (this.initialized) return;

    for (const index of [this.entityIndex, this.relationIndex]) {
      const { body: exists } = await this.client.indices.exists({ index });
      if (!exists) {
        await this.client.indices.create({
          index,
          body: { mappings: { properties: {} } },
        });
      }
    }

    this.initialized = true;
  }

  async addEntity(entity: Entity): Promise<void> {
    await this.init();
    await this.client.index({
      index: this.entityIndex,
      id: entity.id,
      body: entity,
      refresh: true,
    });
  }

  async addRelation(relation: Relation): Promise<void> {
    await this.init();
    await this.client.index({
      index: this.relationIndex,
      id: relation.id,
      body: relation,
      refresh: true,
    });
  }

  async getEntity(id: Id): Promise<Entity | null> {
    await this.init();
    try {
      const { body } = await this.client.get({ index: this.entityIndex, id });
      return body._source as Entity;
    } catch {
      return null;
    }
  }

  async getEntities(filter?: EntityFilter): Promise<Entity[]> {
    await this.init();
    const must: object[] = [];

    if (filter?.type) must.push({ term: { type: filter.type } });
    if (filter?.name) must.push({ wildcard: { name: `*${filter.name}*` } });

    const { body } = await this.client.search({
      index: this.entityIndex,
      body: {
        size: 10000,
        query: must.length > 0 ? { bool: { must } } : { match_all: {} },
      },
    });

    return (body.hits?.hits ?? []).map((hit) => hit._source as Entity);
  }

  async getRelations(entityId: Id, direction: RelationDirection = 'both'): Promise<Relation[]> {
    await this.init();
    const should: object[] = [];

    if (direction === 'out' || direction === 'both') should.push({ term: { sourceId: entityId } });
    if (direction === 'in' || direction === 'both') should.push({ term: { targetId: entityId } });

    const { body } = await this.client.search({
      index: this.relationIndex,
      body: {
        size: 10000,
        query: { bool: { should, minimum_should_match: 1 } },
      },
    });

    return (body.hits?.hits ?? []).map((hit) => hit._source as Relation);
  }

  async traverse(startId: Id, depth: number, relationTypes?: string[]): Promise<Entity[]> {
    const visited = new Set<Id>();
    const result: Entity[] = [];

    const walk = async (id: Id, d: number): Promise<void> => {
      if (d > depth || visited.has(id)) return;
      visited.add(id);

      const entity = await this.getEntity(id);
      if (entity) result.push(entity);

      if (d < depth) {
        let relations = await this.getRelations(id, 'out');
        if (relationTypes) relations = relations.filter((r) => relationTypes.includes(r.type));
        for (const r of relations) await walk(r.targetId, d + 1);
      }
    };

    await walk(startId, 0);
    return result;
  }

  async findPath(fromId: Id, toId: Id, maxDepth = 5): Promise<Relation[]> {
    const visited = new Set<Id>();

    const search = async (id: Id, path: Relation[], d: number): Promise<Relation[] | null> => {
      if (d > maxDepth || visited.has(id)) return null;
      if (id === toId) return path;

      visited.add(id);
      const relations = await this.getRelations(id, 'out');

      for (const r of relations) {
        const result = await search(r.targetId, [...path, r], d + 1);
        if (result) return result;
      }

      visited.delete(id);
      return null;
    };

    return (await search(fromId, [], 0)) ?? [];
  }

  async deleteEntity(id: Id): Promise<void> {
    await this.init();

    // Delete related relations first
    const relations = await this.getRelations(id);
    for (const r of relations) await this.deleteRelation(r.id);

    try {
      await this.client.delete({ index: this.entityIndex, id, refresh: true });
    } catch {
      // Ignore if not found
    }
  }

  async deleteRelation(id: Id): Promise<void> {
    await this.init();
    try {
      await this.client.delete({ index: this.relationIndex, id, refresh: true });
    } catch {
      // Ignore if not found
    }
  }
}
