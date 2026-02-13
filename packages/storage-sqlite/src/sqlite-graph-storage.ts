import type {
  Entity,
  EntityFilter,
  GraphStorage,
  Id,
  Relation,
  RelationDirection,
} from '@flowrag/core';
import Database from 'better-sqlite3';

export interface SQLiteGraphStorageOptions {
  path: string;
}

// Database row types
interface EntityRow {
  id: string;
  name: string;
  type: string;
  description: string;
  source_chunk_ids: string;
  fields: string | null;
}

interface RelationRow {
  id: string;
  source_id: string;
  target_id: string;
  type: string;
  description: string;
  keywords: string;
  source_chunk_ids: string;
  fields: string | null;
}

export class SQLiteGraphStorage implements GraphStorage {
  private db: Database.Database;

  constructor(options: SQLiteGraphStorageOptions) {
    this.db = new Database(options.path);
    this.init();
  }

  private init(): void {
    // Create entities table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS entities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        source_chunk_ids TEXT NOT NULL,
        fields TEXT
      )
    `);

    // Create relations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS relations (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        keywords TEXT NOT NULL,
        source_chunk_ids TEXT NOT NULL,
        fields TEXT,
        FOREIGN KEY (source_id) REFERENCES entities (id),
        FOREIGN KEY (target_id) REFERENCES entities (id)
      )
    `);

    // Create indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_entities_name ON entities (name);
      CREATE INDEX IF NOT EXISTS idx_entities_type ON entities (type);
      CREATE INDEX IF NOT EXISTS idx_relations_source ON relations (source_id);
      CREATE INDEX IF NOT EXISTS idx_relations_target ON relations (target_id);
      CREATE INDEX IF NOT EXISTS idx_relations_type ON relations (type);
    `);
  }

  async addEntity(entity: Entity): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO entities (id, name, type, description, source_chunk_ids, fields)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      entity.id,
      entity.name,
      entity.type,
      entity.description,
      JSON.stringify(entity.sourceChunkIds),
      entity.fields ? JSON.stringify(entity.fields) : null,
    );
  }

  async addRelation(relation: Relation): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO relations (id, source_id, target_id, type, description, keywords, source_chunk_ids, fields)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      relation.id,
      relation.sourceId,
      relation.targetId,
      relation.type,
      relation.description,
      JSON.stringify(relation.keywords),
      JSON.stringify(relation.sourceChunkIds),
      relation.fields ? JSON.stringify(relation.fields) : null,
    );
  }

  async getEntity(id: Id): Promise<Entity | null> {
    const stmt = this.db.prepare('SELECT * FROM entities WHERE id = ?');
    const row = stmt.get(id) as EntityRow | undefined;

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      type: row.type,
      description: row.description,
      sourceChunkIds: JSON.parse(row.source_chunk_ids),
      ...(row.fields ? { fields: JSON.parse(row.fields) } : {}),
    };
  }

  async getEntities(filter?: EntityFilter): Promise<Entity[]> {
    let query = 'SELECT * FROM entities';
    const params: (string | number)[] = [];

    if (filter) {
      const conditions: string[] = [];
      if (filter.type) {
        conditions.push('type = ?');
        params.push(filter.type);
      }
      if (filter.name) {
        conditions.push('name LIKE ?');
        params.push(`%${filter.name}%`);
      }
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as EntityRow[];

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      description: row.description,
      sourceChunkIds: JSON.parse(row.source_chunk_ids),
      ...(row.fields ? { fields: JSON.parse(row.fields) } : {}),
    }));
  }

  async getRelations(entityId: Id, direction: RelationDirection = 'both'): Promise<Relation[]> {
    let query: string;

    switch (direction) {
      case 'out':
        query = 'SELECT * FROM relations WHERE source_id = ?';
        break;
      case 'in':
        query = 'SELECT * FROM relations WHERE target_id = ?';
        break;
      case 'both':
        query = 'SELECT * FROM relations WHERE source_id = ? OR target_id = ?';
        break;
    }

    const stmt = this.db.prepare(query);
    const params = direction === 'both' ? [entityId, entityId] : [entityId];
    const rows = stmt.all(...params) as RelationRow[];

    return rows.map((row) => ({
      id: row.id,
      sourceId: row.source_id,
      targetId: row.target_id,
      type: row.type,
      description: row.description,
      keywords: JSON.parse(row.keywords),
      sourceChunkIds: JSON.parse(row.source_chunk_ids),
      ...(row.fields ? { fields: JSON.parse(row.fields) } : {}),
    }));
  }

  async traverse(startId: Id, depth: number, relationTypes?: string[]): Promise<Entity[]> {
    const visited = new Set<Id>();
    const result: Entity[] = [];

    const traverseRecursive = async (currentId: Id, currentDepth: number): Promise<void> => {
      if (currentDepth > depth || visited.has(currentId)) return;

      visited.add(currentId);
      const entity = await this.getEntity(currentId);
      if (entity) result.push(entity);

      if (currentDepth < depth) {
        const relations = await this.getRelations(currentId, 'out');
        const filteredRelations = relationTypes
          ? relations.filter((r) => relationTypes.includes(r.type))
          : relations;

        for (const relation of filteredRelations) {
          await traverseRecursive(relation.targetId, currentDepth + 1);
        }
      }
    };

    await traverseRecursive(startId, 0);
    return result;
  }

  async findPath(fromId: Id, toId: Id, maxDepth = 5): Promise<Relation[]> {
    const visited = new Set<Id>();

    const findPathRecursive = async (
      currentId: Id,
      targetId: Id,
      path: Relation[],
      depth: number,
    ): Promise<Relation[] | null> => {
      if (depth > maxDepth || visited.has(currentId)) return null;
      if (currentId === targetId) return path;

      visited.add(currentId);
      const relations = await this.getRelations(currentId, 'out');

      for (const relation of relations) {
        const newPath = [...path, relation];
        const result = await findPathRecursive(relation.targetId, targetId, newPath, depth + 1);
        if (result) return result;
      }

      visited.delete(currentId);
      return null;
    };

    return (await findPathRecursive(fromId, toId, [], 0)) || [];
  }

  async deleteEntity(id: Id): Promise<void> {
    const deleteEntity = this.db.prepare('DELETE FROM entities WHERE id = ?');
    const deleteRelations = this.db.prepare(
      'DELETE FROM relations WHERE source_id = ? OR target_id = ?',
    );

    const transaction = this.db.transaction(() => {
      deleteRelations.run(id, id);
      deleteEntity.run(id);
    });

    transaction();
  }

  async deleteRelation(id: Id): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM relations WHERE id = ?');
    stmt.run(id);
  }

  close(): void {
    this.db.close();
  }
}
