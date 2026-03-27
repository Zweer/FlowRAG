import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { VectorRecord } from '@flowrag/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SQLiteVectorStorage } from '../src/index.js';

describe('SQLiteVectorStorage', () => {
  let storage: SQLiteVectorStorage;
  let testPath: string;

  beforeEach(() => {
    testPath = join(tmpdir(), `flowrag-test-sqlite-vec-${Date.now()}.db`);
    storage = new SQLiteVectorStorage({ path: testPath, dimensions: 3 });
  });

  afterEach(async () => {
    storage.close();
    await rm(testPath, { force: true });
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

      const results = await storage.search([1.0, 0.0, 0.0], 2);

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('doc-1');
      expect(results[0].metadata).toEqual({ type: 'document', title: 'First Document' });
      expect(typeof results[0].score).toBe('number');
    });

    it('should handle empty upsert', async () => {
      await expect(storage.upsert([])).resolves.not.toThrow();
      const count = await storage.count();
      expect(count).toBe(0);
    });

    it('should update existing records', async () => {
      await storage.upsert([testRecords[0]]);

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

    it('should search with empty filter', async () => {
      await storage.upsert(testRecords);

      const results = await storage.search([1.0, 0.0, 0.0], 10, {});
      expect(results.length).toBe(3);
    });

    it('should search with boolean filter', async () => {
      const records: VectorRecord[] = [
        {
          id: 'bool-1',
          vector: [1.0, 0.0, 0.0],
          metadata: { _kind: 'chunk', active: true },
        },
        {
          id: 'bool-2',
          vector: [0.0, 1.0, 0.0],
          metadata: { _kind: 'entity', active: false },
        },
      ];

      await storage.upsert(records);

      const results = await storage.search([1.0, 0.0, 0.0], 10, { _kind: 'chunk' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('bool-1');
    });

    it('should filter results below limit when filter removes matches', async () => {
      await storage.upsert(testRecords);

      // Only 1 chunk record exists, ask for 10
      const results = await storage.search([0.0, 0.0, 1.0], 10, { type: 'chunk' });
      expect(results).toHaveLength(1);
      expect(results[0].metadata.type).toBe('chunk');
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
        { id: '1', vector: [1, 0, 0], metadata: {} },
        { id: '2', vector: [0, 1, 0], metadata: {} },
        { id: '3', vector: [1, 1, 0], metadata: {} },
      ];

      await storage.upsert(records);

      const count = await storage.count();
      expect(count).toBe(3);
    });
  });

  describe('table management', () => {
    it('should work with custom table name', async () => {
      const customPath = join(tmpdir(), `flowrag-custom-${Date.now()}.db`);
      const customStorage = new SQLiteVectorStorage({
        path: customPath,
        dimensions: 3,
        tableName: 'custom_vectors',
      });

      const record: VectorRecord = {
        id: 'test',
        vector: [1.0, 0.0, 0.0],
        metadata: { test: true },
      };

      await customStorage.upsert([record]);
      const count = await customStorage.count();
      expect(count).toBe(1);

      customStorage.close();
      await rm(customPath, { force: true });
    });

    it('should handle multiple operations', async () => {
      const record: VectorRecord = {
        id: 'test',
        vector: [1.0, 0.0, 0.0],
        metadata: {},
      };

      await storage.upsert([record]);
      await storage.count();
      await storage.search([1.0, 0.0, 0.0], 1);

      const finalCount = await storage.count();
      expect(finalCount).toBe(1);
    });
  });
});
