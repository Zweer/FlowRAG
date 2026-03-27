import type { Id, SearchResult, VectorFilter, VectorRecord, VectorStorage } from '@flowrag/core';
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';

export interface SQLiteVectorStorageOptions {
  path: string;
  dimensions: number;
  tableName?: string;
}

export class SQLiteVectorStorage implements VectorStorage {
  private db: Database.Database;
  private readonly tableName: string;
  private readonly dimensions: number;

  constructor(options: SQLiteVectorStorageOptions) {
    this.dimensions = options.dimensions;
    this.tableName = options.tableName ?? 'vec_vectors';
    this.db = new Database(options.path);
    sqliteVec.load(this.db);
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS ${this.tableName} USING vec0(
        id TEXT PRIMARY KEY,
        embedding float[${this.dimensions}],
        +metadata TEXT
      )
    `);
  }

  async upsert(records: VectorRecord[]): Promise<void> {
    if (records.length === 0) return;

    // Delete existing records first (same as LanceDB)
    await this.delete(records.map((r) => r.id));

    const stmt = this.db.prepare(
      `INSERT INTO ${this.tableName} (id, embedding, metadata) VALUES (?, ?, ?)`,
    );

    const transaction = this.db.transaction(() => {
      for (const record of records) {
        stmt.run(record.id, new Float32Array(record.vector), JSON.stringify(record.metadata));
      }
    });

    transaction();
  }

  async search(vector: number[], limit: number, filter?: VectorFilter): Promise<SearchResult[]> {
    // When filtering, fetch more results to compensate for post-filter reduction
    const fetchLimit = filter && Object.keys(filter).length > 0 ? limit * 10 : limit;

    const rows = this.db
      .prepare(
        `SELECT id, distance, metadata
         FROM ${this.tableName}
         WHERE embedding MATCH ?
           AND k = ?
         ORDER BY distance`,
      )
      .all(new Float32Array(vector), fetchLimit) as Array<{
      id: string;
      distance: number;
      metadata: string;
    }>;

    let results: SearchResult[] = rows.map((row) => ({
      id: row.id,
      score: row.distance,
      metadata: JSON.parse(row.metadata),
    }));

    if (filter && Object.keys(filter).length > 0) {
      results = results.filter((result) =>
        Object.entries(filter).every(([key, value]) => result.metadata[key] === value),
      );
    }

    return results.slice(0, limit);
  }

  async delete(ids: Id[]): Promise<void> {
    if (ids.length === 0) return;

    const stmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`);

    const transaction = this.db.transaction(() => {
      for (const id of ids) {
        stmt.run(id);
      }
    });

    transaction();
  }

  async count(): Promise<number> {
    const row = this.db.prepare(`SELECT COUNT(*) as count FROM ${this.tableName}`).get() as {
      count: number;
    };

    return row.count;
  }

  close(): void {
    this.db.close();
  }
}
