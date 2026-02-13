import type { Id, SearchResult, VectorFilter, VectorRecord, VectorStorage } from '@flowrag/core';
import type { Client } from '@opensearch-project/opensearch';

export interface OpenSearchVectorStorageOptions {
  client: Client;
  index?: string;
  dimensions: number;
}

export class OpenSearchVectorStorage implements VectorStorage {
  private readonly client: Client;
  private readonly index: string;
  private readonly dimensions: number;
  private initialized = false;

  constructor(options: OpenSearchVectorStorageOptions) {
    this.client = options.client;
    this.index = options.index ?? 'flowrag-vectors';
    this.dimensions = options.dimensions;
  }

  private async init(): Promise<void> {
    if (this.initialized) return;
    const { body: exists } = await this.client.indices.exists({ index: this.index });
    if (!exists) {
      await this.client.indices.create({
        index: this.index,
        body: {
          settings: { 'index.knn': true },
          mappings: {
            properties: {
              vector: { type: 'knn_vector', dimension: this.dimensions },
              metadata: { type: 'object', enabled: false },
            },
          },
        },
      });
    }
    this.initialized = true;
  }

  async upsert(records: VectorRecord[]): Promise<void> {
    if (records.length === 0) return;
    await this.init();

    const body = records.flatMap((r) => [
      { index: { _index: this.index, _id: r.id } },
      { vector: r.vector, metadata: r.metadata },
    ]);

    await this.client.bulk({ body, refresh: true });
  }

  async search(vector: number[], limit: number, _filter?: VectorFilter): Promise<SearchResult[]> {
    await this.init();

    const { body } = await this.client.search({
      index: this.index,
      body: {
        size: limit,
        query: { knn: { vector: { vector, k: limit } } },
      },
    });

    return (body.hits?.hits ?? []).map((hit) => ({
      id: hit._id as string,
      score: (hit._score as number) ?? 0,
      metadata: (hit._source as { metadata?: Record<string, unknown> })?.metadata ?? {},
    }));
  }

  async delete(ids: Id[]): Promise<void> {
    if (ids.length === 0) return;
    await this.init();

    const body = ids.flatMap((id) => [{ delete: { _index: this.index, _id: id } }]);
    await this.client.bulk({ body, refresh: true });
  }

  async count(): Promise<number> {
    await this.init();
    const { body } = await this.client.count({ index: this.index });
    return body.count;
  }
}
