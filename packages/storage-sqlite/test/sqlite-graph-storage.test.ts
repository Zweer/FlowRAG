import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Entity, Relation } from '@flowrag/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SQLiteGraphStorage } from '../src/index.js';

describe('SQLiteGraphStorage', () => {
  let storage: SQLiteGraphStorage;
  let testPath: string;

  beforeEach(() => {
    testPath = join(tmpdir(), `flowrag-test-${Date.now()}.db`);
    storage = new SQLiteGraphStorage({ path: testPath });
  });

  afterEach(async () => {
    storage.close();
    await rm(testPath, { force: true });
  });

  describe('entities', () => {
    const testEntity: Entity = {
      id: 'entity-1',
      name: 'Test Service',
      type: 'SERVICE',
      description: 'A test service for unit tests',
      sourceChunkIds: ['chunk-1', 'chunk-2'],
    };

    it('should add and retrieve entity', async () => {
      await storage.addEntity(testEntity);
      const result = await storage.getEntity('entity-1');
      expect(result).toEqual(testEntity);
    });

    it('should return null for non-existent entity', async () => {
      const result = await storage.getEntity('missing');
      expect(result).toBeNull();
    });

    it('should update existing entity', async () => {
      await storage.addEntity(testEntity);
      const updated = { ...testEntity, description: 'Updated description' };
      await storage.addEntity(updated);
      const result = await storage.getEntity('entity-1');
      expect(result?.description).toBe('Updated description');
    });

    it('should get all entities', async () => {
      const entity2: Entity = {
        id: 'entity-2',
        name: 'Another Service',
        type: 'DATABASE',
        description: 'Another test entity',
        sourceChunkIds: ['chunk-3'],
      };

      await storage.addEntity(testEntity);
      await storage.addEntity(entity2);

      const entities = await storage.getEntities();
      expect(entities).toHaveLength(2);
      expect(entities.map((e) => e.id).sort()).toEqual(['entity-1', 'entity-2']);
    });

    it('should filter entities by type', async () => {
      const entity2: Entity = {
        id: 'entity-2',
        name: 'Database',
        type: 'DATABASE',
        description: 'A database',
        sourceChunkIds: [],
      };

      await storage.addEntity(testEntity);
      await storage.addEntity(entity2);

      const services = await storage.getEntities({ type: 'SERVICE' });
      expect(services).toHaveLength(1);
      expect(services[0].id).toBe('entity-1');
    });

    it('should get entities with empty filter object', async () => {
      await storage.addEntity(testEntity);

      // Test with empty filter object (should hit the conditions.length === 0 branch)
      const entities = await storage.getEntities({});
      expect(entities).toHaveLength(1);
      expect(entities[0].id).toBe('entity-1');
    });

    it('should get entities without filter', async () => {
      await storage.addEntity(testEntity);

      // Test without any filter (should hit the conditions.length === 0 branch)
      const entities = await storage.getEntities();
      expect(entities).toHaveLength(1);
      expect(entities[0].id).toBe('entity-1');
    });

    it('should filter entities by name and type combined', async () => {
      const entity2: Entity = {
        id: 'entity-2',
        name: 'Test Database',
        type: 'DATABASE',
        description: 'A test database',
        sourceChunkIds: [],
      };

      await storage.addEntity(testEntity);
      await storage.addEntity(entity2);

      const filtered = await storage.getEntities({ name: 'Test', type: 'SERVICE' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('entity-1');
    });

    it('should filter entities by name', async () => {
      const entity2: Entity = {
        id: 'entity-2',
        name: 'Different Name',
        type: 'SERVICE',
        description: 'Different service',
        sourceChunkIds: [],
      };

      await storage.addEntity(testEntity);
      await storage.addEntity(entity2);

      const filtered = await storage.getEntities({ name: 'Test' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('entity-1');
    });

    it('should delete entity and its relations', async () => {
      const entity2: Entity = {
        id: 'entity-2',
        name: 'Target',
        type: 'SERVICE',
        description: 'Target entity',
        sourceChunkIds: [],
      };

      const relation: Relation = {
        id: 'relation-1',
        sourceId: 'entity-1',
        targetId: 'entity-2',
        type: 'USES',
        description: 'Uses relation',
        keywords: ['uses'],
        sourceChunkIds: ['chunk-1'],
      };

      await storage.addEntity(testEntity);
      await storage.addEntity(entity2);
      await storage.addRelation(relation);

      await storage.deleteEntity('entity-1');

      const entity = await storage.getEntity('entity-1');
      const relations = await storage.getRelations('entity-2');

      expect(entity).toBeNull();
      expect(relations).toHaveLength(0);
    });
  });

  describe('relations', () => {
    const entity1: Entity = {
      id: 'entity-1',
      name: 'Source',
      type: 'SERVICE',
      description: 'Source entity',
      sourceChunkIds: [],
    };

    const entity2: Entity = {
      id: 'entity-2',
      name: 'Target',
      type: 'DATABASE',
      description: 'Target entity',
      sourceChunkIds: [],
    };

    const testRelation: Relation = {
      id: 'relation-1',
      sourceId: 'entity-1',
      targetId: 'entity-2',
      type: 'USES',
      description: 'Service uses database',
      keywords: ['database', 'connection'],
      sourceChunkIds: ['chunk-1'],
    };

    beforeEach(async () => {
      await storage.addEntity(entity1);
      await storage.addEntity(entity2);
    });

    it('should add and retrieve relations', async () => {
      await storage.addRelation(testRelation);
      const relations = await storage.getRelations('entity-1', 'out');
      expect(relations).toHaveLength(1);
      expect(relations[0]).toEqual(testRelation);
    });

    it('should get outgoing relations', async () => {
      await storage.addRelation(testRelation);
      const relations = await storage.getRelations('entity-1', 'out');
      expect(relations).toHaveLength(1);
      expect(relations[0].targetId).toBe('entity-2');
    });

    it('should get incoming relations', async () => {
      await storage.addRelation(testRelation);
      const relations = await storage.getRelations('entity-2', 'in');
      expect(relations).toHaveLength(1);
      expect(relations[0].sourceId).toBe('entity-1');
    });

    it('should get both directions', async () => {
      await storage.addRelation(testRelation);
      const relations1 = await storage.getRelations('entity-1', 'both');
      const relations2 = await storage.getRelations('entity-2', 'both');
      expect(relations1).toHaveLength(1);
      expect(relations2).toHaveLength(1);
    });

    it('should delete relation', async () => {
      await storage.addRelation(testRelation);
      await storage.deleteRelation('relation-1');
      const relations = await storage.getRelations('entity-1');
      expect(relations).toHaveLength(0);
    });
  });

  describe('graph traversal', () => {
    beforeEach(async () => {
      // Create a simple graph: A -> B -> C
      const entities: Entity[] = [
        { id: 'A', name: 'Entity A', type: 'SERVICE', description: 'First', sourceChunkIds: [] },
        { id: 'B', name: 'Entity B', type: 'SERVICE', description: 'Second', sourceChunkIds: [] },
        { id: 'C', name: 'Entity C', type: 'SERVICE', description: 'Third', sourceChunkIds: [] },
      ];

      const relations: Relation[] = [
        {
          id: 'rel-1',
          sourceId: 'A',
          targetId: 'B',
          type: 'USES',
          description: 'A uses B',
          keywords: [],
          sourceChunkIds: [],
        },
        {
          id: 'rel-2',
          sourceId: 'B',
          targetId: 'C',
          type: 'PRODUCES',
          description: 'B produces C',
          keywords: [],
          sourceChunkIds: [],
        },
      ];

      for (const entity of entities) {
        await storage.addEntity(entity);
      }
      for (const relation of relations) {
        await storage.addRelation(relation);
      }
    });

    it('should traverse graph with depth limit', async () => {
      const result = await storage.traverse('A', 1);
      const ids = result.map((e) => e.id).sort();
      expect(ids).toEqual(['A', 'B']);
    });

    it('should traverse full graph', async () => {
      const result = await storage.traverse('A', 2);
      const ids = result.map((e) => e.id).sort();
      expect(ids).toEqual(['A', 'B', 'C']);
    });

    it('should filter by relation types', async () => {
      const result = await storage.traverse('A', 2, ['USES']);
      const ids = result.map((e) => e.id).sort();
      expect(ids).toEqual(['A', 'B']);
    });

    it('should find path between entities', async () => {
      const path = await storage.findPath('A', 'C');
      expect(path).toHaveLength(2);
      expect(path[0].sourceId).toBe('A');
      expect(path[0].targetId).toBe('B');
      expect(path[1].sourceId).toBe('B');
      expect(path[1].targetId).toBe('C');
    });

    it('should return empty path when no connection', async () => {
      const path = await storage.findPath('C', 'A');
      expect(path).toHaveLength(0);
    });

    it('should handle traverse starting from non-existent entity', async () => {
      // Test traverse starting from entity that doesn't exist
      const result = await storage.traverse('NON_EXISTENT', 2);

      // Should return empty array since starting entity doesn't exist
      expect(result).toHaveLength(0);
    });

    it('should handle traverse with visited nodes (avoid cycles)', async () => {
      // Create a cycle: A -> B -> A
      const cycleRelation: Relation = {
        id: 'rel-cycle',
        sourceId: 'B',
        targetId: 'A',
        type: 'CYCLES',
        description: 'Creates a cycle',
        keywords: [],
        sourceChunkIds: [],
      };

      await storage.addRelation(cycleRelation);
      const result = await storage.traverse('A', 5); // High depth

      // Should not get stuck in infinite loop, each entity appears only once
      const ids = result.map((e) => e.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });

    it('should respect max depth in path finding', async () => {
      const path = await storage.findPath('A', 'C', 1);
      expect(path).toHaveLength(0);
    });
  });
});
