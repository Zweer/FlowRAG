import type { Id, SearchResult, VectorFilter, VectorRecord, VectorStorage } from '@flowrag/core';
import { type Connection, connect, type Table } from '@lancedb/lancedb';

export interface LanceDBVectorStorageOptions {
  path: string;
  tableName?: string;
}

interface LanceDBRecord extends Record<string, unknown> {
  id: string;
  vector: number[];
  metadata: string; // JSON stringified
}

interface LanceDBResult {
  id: string;
  _distance?: number;
  metadata: string;
}

export class LanceDBVectorStorage implements VectorStorage {
  private connection: Connection | null = null;
  private table: Table | null = null;
  private readonly path: string;
  private readonly tableName: string;

  constructor(options: LanceDBVectorStorageOptions) {
    this.path = options.path;
    this.tableName = options.tableName || 'vectors';
  }

  private async getConnection(): Promise<Connection> {
    if (!this.connection) {
      this.connection = await connect(this.path);
    }

    return this.connection;
  }

  private async getTable(): Promise<Table | null> {
    const connection = await this.getConnection();

    if (!this.table) {
      try {
        this.table = await connection.openTable(this.tableName);
      } catch {
        // Table doesn't exist
        return null;
      }
    }

    return this.table;
  }

  async upsert(records: VectorRecord[]): Promise<void> {
    if (records.length === 0) return;

    const lanceRecords: LanceDBRecord[] = records.map((record) => ({
      id: record.id,
      vector: record.vector,
      metadata: JSON.stringify(record.metadata),
    }));

    const table = await this.getTable();

    if (!table) {
      // Create table with first batch
      const connection = await this.getConnection();

      this.table = await connection.createTable(this.tableName, lanceRecords);

      return;
    }

    // Delete existing records with same IDs first
    const existingIds = records.map((r) => r.id);
    await this.delete(existingIds);

    await table.add(lanceRecords);
  }

  async search(vector: number[], limit: number, filter?: VectorFilter): Promise<SearchResult[]> {
    const table = await this.getTable();
    if (!table) return []; // No table means no data

    let query = table.vectorSearch(vector).limit(limit);

    if (filter) {
      const conditions: string[] = [];
      for (const [key, value] of Object.entries(filter)) {
        if (typeof value === 'string') {
          conditions.push(`metadata LIKE '%"${key}":"${value}"%'`);
        } else if (typeof value === 'number') {
          conditions.push(`metadata LIKE '%"${key}":${value}%'`);
        }
      }
      if (conditions.length > 0) {
        query = query.where(conditions.join(' AND '));
      }
    }

    const results = await query.toArray();

    return results.map((result: LanceDBResult) => ({
      id: result.id,
      score: result._distance || 0,
      metadata: JSON.parse(result.metadata),
    }));
  }

  async delete(ids: Id[]): Promise<void> {
    if (ids.length === 0) return;

    const table = await this.getTable();
    if (!table) return; // No table means nothing to delete

    const conditions = ids.map((id) => `id = '${id}'`).join(' OR ');
    await table.delete(conditions);
  }

  async count(): Promise<number> {
    const table = await this.getTable();
    if (!table) return 0; // No table means no records

    return await table.countRows();
  }

  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.close();

      this.connection = null;
      this.table = null;
    }
  }
}
