import type { Id, SearchResult, VectorFilter, VectorRecord, VectorStorage } from '@flowrag/core';
import type { createClient } from 'redis';

type RedisClient = ReturnType<typeof createClient>;

export interface RedisVectorStorageOptions {
  client: RedisClient;
  index?: string;
  prefix?: string;
  dimensions: number;
}

export class RedisVectorStorage implements VectorStorage {
  private readonly client: RedisClient;
  private readonly index: string;
  private readonly prefix: string;
  private readonly dimensions: number;
  private initialized = false;

  constructor(options: RedisVectorStorageOptions) {
    this.client = options.client;
    this.index = options.index ?? 'flowrag-vectors';
    this.prefix = options.prefix ?? 'flowrag:vec:';
    this.dimensions = options.dimensions;
  }

  private async init(): Promise<void> {
    if (this.initialized) return;
    try {
      await this.client.ft.info(this.index);
    } catch {
      await this.client.ft.create(
        this.index,
        {
          embedding: {
            type: 'VECTOR' as never,
            TYPE: 'FLOAT32',
            ALGORITHM: 'HNSW',
            DISTANCE_METRIC: 'COSINE',
            DIM: this.dimensions,
          },
          metadata: { type: 'TEXT' as never, NOINDEX: true },
        },
        { ON: 'HASH', PREFIX: this.prefix },
      );
    }
    this.initialized = true;
  }

  async upsert(records: VectorRecord[]): Promise<void> {
    if (records.length === 0) return;
    await this.init();

    await Promise.all(
      records.map((r) =>
        this.client.hSet(`${this.prefix}${r.id}`, {
          embedding: Buffer.from(new Float32Array(r.vector).buffer),
          metadata: JSON.stringify(r.metadata),
        }),
      ),
    );
  }

  async search(vector: number[], limit: number, _filter?: VectorFilter): Promise<SearchResult[]> {
    await this.init();

    const result = await this.client.ft.search(
      this.index,
      `*=>[KNN ${limit} @embedding $B AS score]`,
      {
        PARAMS: { B: Buffer.from(new Float32Array(vector).buffer) },
        RETURN: ['score', 'metadata'],
        DIALECT: 2,
      },
    );

    // biome-ignore lint/suspicious/noExplicitAny: redis ft.search returns complex union type
    return (result as any).documents.map((doc: any) => ({
      id: (doc.id as string).slice(this.prefix.length),
      score: 1 - Number(doc.value.score ?? 0),
      metadata: doc.value.metadata ? JSON.parse(doc.value.metadata as string) : {},
    }));
  }

  async delete(ids: Id[]): Promise<void> {
    if (ids.length === 0) return;
    await this.client.del(ids.map((id) => `${this.prefix}${id}`));
  }

  async count(): Promise<number> {
    await this.init();
    const info = await this.client.ft.info(this.index);
    // biome-ignore lint/suspicious/noExplicitAny: redis ft.info returns complex union type
    return Number((info as any).numDocs);
  }
}
