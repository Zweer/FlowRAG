import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { VectorRecord } from '@flowrag/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LanceDBVectorStorage } from '../src/index.js';

describe('LanceDBVectorStorage', () => {
  let storage: LanceDBVectorStorage;
  let testPath: string;

  beforeEach(() => {
    testPath = join(tmpdir(), `flowrag-test-lance-${Date.now()}`);
    storage = new LanceDBVectorStorage({ path: testPath });
  });

  afterEach(async () => {
    await storage.close();
    await rm(testPath, { recursive: true, force: true });
  });

  describe('upsert and search', () => {
    const testRecords: VectorRecord[] = [
      {
        id: 'doc-1',
        vector: [1.0, 0.0, 0.0],
        metadata: { type: 'document', title: 'First Document' },
      },
      {
        id: 'doc-2',
        vector: [0.0, 1.0, 0.0],
        metadata: { type: 'document', title: 'Second Document' },
      },
      {
        id: 'chunk-1',
        vector: [0.0, 0.0, 1.0],
        metadata: { type: 'chunk', parent: 'doc-1' },
      },
    ];

    it('should upsert and search vectors', async () => {
      await storage.upsert(testRecords);

      // Search for similar to first vector
      const results = await storage.search([1.0, 0.0, 0.0], 2);

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('doc-1');
      expect(results[0].metadata).toEqual({ type: 'document', title: 'First Document' });
      expect(typeof results[0].score).toBe('number');
    });

    it('should create table on first upsert when table does not exist', async () => {
      // Create a completely fresh storage instance
      const freshPath = join(tmpdir(), `flowrag-fresh-${Date.now()}`);
      const freshStorage = new LanceDBVectorStorage({ path: freshPath });

      // First, verify table doesn't exist by checking count returns 0
      const initialCount = await freshStorage.count();
      expect(initialCount).toBe(0);

      // Now add first record - this should trigger table creation
      const record: VectorRecord = {
        id: 'first',
        vector: [1.0, 0.0],
        metadata: { isFirst: true },
      };

      await freshStorage.upsert([record]);

      const count = await freshStorage.count();
      expect(count).toBe(1);

      await freshStorage.close();
      await rm(freshPath, { recursive: true, force: true });
    });

    it('should create table on first upsert', async () => {
      // Ensure we start with no table
      const freshStorage = new LanceDBVectorStorage({ path: `${testPath}-fresh` });

      const record: VectorRecord = {
        id: 'first',
        vector: [1.0, 0.0],
        metadata: { isFirst: true },
      };

      await freshStorage.upsert([record]);

      const count = await freshStorage.count();
      expect(count).toBe(1);

      const results = await freshStorage.search([1.0, 0.0], 1);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('first');

      await freshStorage.close();
    });

    it('should handle empty upsert', async () => {
      await expect(storage.upsert([])).resolves.not.toThrow();
      const count = await storage.count();
      expect(count).toBe(0);
    });

    it('should update existing records', async () => {
      await storage.upsert([testRecords[0]]);

      // Update the same record
      const updated: VectorRecord = {
        id: 'doc-1',
        vector: [0.5, 0.5, 0.0],
        metadata: { type: 'document', title: 'Updated Document' },
      };

      await storage.upsert([updated]);

      const results = await storage.search([0.5, 0.5, 0.0], 1);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('doc-1');
      expect(results[0].metadata.title).toBe('Updated Document');
    });

    it('should search with limit', async () => {
      await storage.upsert(testRecords);

      const results = await storage.search([1.0, 0.0, 0.0], 1);
      expect(results).toHaveLength(1);
    });

    it('should search with string filter', async () => {
      await storage.upsert(testRecords);

      const results = await storage.search([1.0, 0.0, 0.0], 10, { type: 'document' });

      expect(results.length).toBeGreaterThan(0);
      for (const result of results) {
        expect(result.metadata.type).toBe('document');
      }
    });

    it('should search with number filter', async () => {
      const recordsWithNumbers: VectorRecord[] = [
        {
          id: 'item-1',
          vector: [1.0, 0.0, 0.0],
          metadata: { category: 'A', priority: 1 },
        },
        {
          id: 'item-2',
          vector: [0.0, 1.0, 0.0],
          metadata: { category: 'B', priority: 2 },
        },
      ];

      await storage.upsert(recordsWithNumbers);

      const results = await storage.search([1.0, 0.0, 0.0], 10, { priority: 1 });

      expect(results.length).toBeGreaterThan(0);
      for (const result of results) {
        expect(result.metadata.priority).toBe(1);
      }
    });

    it('should search without filter', async () => {
      await storage.upsert(testRecords);

      const results = await storage.search([1.0, 0.0, 0.0], 10);
      expect(results.length).toBe(3);
    });
  });

  describe('delete', () => {
    const testRecords: VectorRecord[] = [
      {
        id: 'doc-1',
        vector: [1.0, 0.0, 0.0],
        metadata: { type: 'document' },
      },
      {
        id: 'doc-2',
        vector: [0.0, 1.0, 0.0],
        metadata: { type: 'document' },
      },
    ];

    it('should delete records by ids', async () => {
      await storage.upsert(testRecords);

      let count = await storage.count();
      expect(count).toBe(2);

      await storage.delete(['doc-1']);

      count = await storage.count();
      expect(count).toBe(1);

      const results = await storage.search([1.0, 0.0, 0.0], 10);
      expect(results.every((r) => r.id !== 'doc-1')).toBe(true);
    });

    it('should handle empty delete', async () => {
      await storage.upsert(testRecords);
      await expect(storage.delete([])).resolves.not.toThrow();

      const count = await storage.count();
      expect(count).toBe(2);
    });

    it('should handle delete of non-existent ids', async () => {
      await storage.upsert(testRecords);
      await expect(storage.delete(['non-existent'])).resolves.not.toThrow();

      const count = await storage.count();
      expect(count).toBe(2);
    });
  });

  describe('count', () => {
    it('should return zero for empty table', async () => {
      const count = await storage.count();
      expect(count).toBe(0);
    });

    it('should return correct count after upsert', async () => {
      const records: VectorRecord[] = [
        { id: '1', vector: [1, 0], metadata: {} },
        { id: '2', vector: [0, 1], metadata: {} },
        { id: '3', vector: [1, 1], metadata: {} },
      ];

      await storage.upsert(records);

      const count = await storage.count();
      expect(count).toBe(3);
    });
  });

  describe('table management', () => {
    it('should work with custom table name', async () => {
      const customStorage = new LanceDBVectorStorage({
        path: testPath,
        tableName: 'custom_vectors',
      });

      const record: VectorRecord = {
        id: 'test',
        vector: [1.0, 0.0],
        metadata: { test: true },
      };

      await customStorage.upsert([record]);
      const count = await customStorage.count();
      expect(count).toBe(1);

      await customStorage.close();
    });

    it('should create table during upsert when table is null', async () => {
      // Create a completely new storage instance
      const newPath = join(tmpdir(), `flowrag-null-table-${Date.now()}`);
      const newStorage = new LanceDBVectorStorage({ path: newPath });

      // Directly call upsert without any prior operations
      // This should trigger the table creation path in upsert
      const record: VectorRecord = {
        id: 'null-table-test',
        vector: [1.0, 0.0],
        metadata: { nullTable: true },
      };

      await newStorage.upsert([record]);

      const count = await newStorage.count();
      expect(count).toBe(1);

      await newStorage.close();
      await rm(newPath, { recursive: true, force: true });
    });

    it('should handle ensureTable early return when table exists', async () => {
      // Create initial record
      await storage.upsert([
        {
          id: 'initial',
          vector: [1.0, 0.0],
          metadata: { initial: true },
        },
      ]);

      // Now table exists, ensureTable should return early
      // This should hit the "if (this.table) return;" branch
      await storage.upsert([
        {
          id: 'second',
          vector: [0.0, 1.0],
          metadata: { second: true },
        },
      ]);

      const count = await storage.count();
      expect(count).toBe(2);
    });

    it('should search without any filters', async () => {
      await storage.upsert([
        {
          id: 'no-filter',
          vector: [1.0, 0.0],
          metadata: { test: true },
        },
      ]);

      // Search without filter parameter at all
      const results = await storage.search([1.0, 0.0], 10);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle ensureTable when table already exists', async () => {
      // First create a record to ensure table exists
      const record: VectorRecord = {
        id: 'existing-table',
        vector: [1.0, 0.0],
        metadata: { existing: true },
      };

      await storage.upsert([record]);

      // Now call upsert again - this should hit the "table already exists" branch
      const record2: VectorRecord = {
        id: 'second-record',
        vector: [0.0, 1.0],
        metadata: { second: true },
      };

      await storage.upsert([record2]);

      const count = await storage.count();
      expect(count).toBe(2);
    });

    it('should search with boolean filter (unsupported type)', async () => {
      const records: VectorRecord[] = [
        {
          id: 'bool-test',
          vector: [1.0, 0.0],
          metadata: { active: true, count: 5 },
        },
      ];

      await storage.upsert(records);

      // Search with boolean filter (should be ignored since it's not string/number)
      const results = await storage.search([1.0, 0.0], 10, { active: true });

      // Should still return results since boolean filter is ignored
      expect(results.length).toBeGreaterThan(0);
    });

    it('should search with empty filter conditions', async () => {
      const records: VectorRecord[] = [
        {
          id: 'empty-filter',
          vector: [1.0, 0.0],
          metadata: { test: 'value' },
        },
      ];

      await storage.upsert(records);

      // Search with filter that produces no conditions
      const results = await storage.search([1.0, 0.0], 10, {});

      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle ensureTable when table is null', async () => {
      // Create a fresh storage to test the ensureTable path
      const freshPath = join(tmpdir(), `flowrag-ensure-${Date.now()}`);
      const storage = new LanceDBVectorStorage({ path: freshPath });

      // Call count first to initialize connection but leave table as null
      await storage.count(); // This initializes connection but table stays null

      // Now upsert should go through the ensureTable -> table creation path
      const record: VectorRecord = {
        id: 'ensure-test',
        vector: [1.0, 0.0],
        metadata: { ensure: true },
      };

      await storage.upsert([record]);

      const count = await storage.count();
      expect(count).toBe(1);

      await storage.close();
      await rm(freshPath, { recursive: true, force: true });
    });

    it('should reuse tableInitPromise on concurrent upserts', async () => {
      const freshPath = join(tmpdir(), `flowrag-concurrent-${Date.now()}`);
      const freshStorage = new LanceDBVectorStorage({ path: freshPath });

      const record1: VectorRecord = { id: 'c1', vector: [1.0, 0.0], metadata: { n: 1 } };
      const record2: VectorRecord = { id: 'c2', vector: [0.0, 1.0], metadata: { n: 2 } };

      // Two concurrent upserts on a fresh storage — second hits the existing tableInitPromise branch
      await Promise.all([freshStorage.upsert([record1]), freshStorage.upsert([record2])]);

      const count = await freshStorage.count();
      expect(count).toBe(2);

      await freshStorage.close();
      await rm(freshPath, { recursive: true, force: true });
    });

    it('should handle multiple init calls', async () => {
      const record: VectorRecord = {
        id: 'test',
        vector: [1.0, 0.0],
        metadata: {},
      };

      // Multiple operations should not cause issues
      await storage.upsert([record]);
      await storage.count();
      await storage.search([1.0, 0.0], 1);

      const finalCount = await storage.count();
      expect(finalCount).toBe(1);
    });

    it('should cover table creation branch in upsert', async () => {
      // Create a fresh storage instance to ensure no table exists
      const freshStorage = new LanceDBVectorStorage({
        path: testPath,
        tableName: 'fresh_table',
      });

      const records: VectorRecord[] = [
        {
          id: 'fresh1',
          vector: [1, 0, 0],
          metadata: { type: 'fresh' },
        },
      ];

      // This should trigger the table creation branch
      await freshStorage.upsert(records);

      const count = await freshStorage.count();
      expect(count).toBe(1);

      await freshStorage.close();
    });

    it('should cover existing table branch in upsert', async () => {
      // First, create a table with some data
      await storage.upsert([
        { id: 'existing1', vector: [1, 0, 0], metadata: { type: 'existing' } },
      ]);

      // Now upsert more data - this should trigger the existing table branch
      await storage.upsert([
        { id: 'existing2', vector: [0, 1, 0], metadata: { type: 'existing' } },
      ]);

      const count = await storage.count();
      expect(count).toBe(2);
    });

    it('should handle search on non-existent table', async () => {
      // Create fresh storage with different table name
      const emptyStorage = new LanceDBVectorStorage({
        path: testPath,
        tableName: 'nonexistent_table',
      });

      // Search should return empty array
      const results = await emptyStorage.search([1, 0, 0], 10);
      expect(results).toEqual([]);

      await emptyStorage.close();
    });

    it('should handle delete on non-existent table', async () => {
      // Create fresh storage with different table name
      const emptyStorage = new LanceDBVectorStorage({
        path: testPath,
        tableName: 'nonexistent_delete_table',
      });

      // Delete should not throw
      await expect(emptyStorage.delete(['nonexistent'])).resolves.toBeUndefined();

      await emptyStorage.close();
    });
  });
});
