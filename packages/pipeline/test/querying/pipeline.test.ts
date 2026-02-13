import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QueryPipeline } from '../../src/querying/pipeline.js';
import type { FlowRAGConfig, QueryOptions, SearchResult } from '../../src/types.js';

describe('QueryPipeline', () => {
  let pipeline: QueryPipeline;
  let mockConfig: FlowRAGConfig;
  let mockOptions: Required<QueryOptions>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      schema: {
        entityTypes: ['SERVICE'],
        relationTypes: ['USES'],
        documentFields: {},
        entityFields: {},
        relationFields: {},
        isValidEntityType: vi.fn(() => true),
        isValidRelationType: vi.fn(() => true),
        normalizeEntityType: vi.fn((type) => type),
        normalizeRelationType: vi.fn((type) => type),
      },
      storage: {
        kv: {
          get: vi.fn(),
          set: vi.fn(),
          delete: vi.fn(),
          clear: vi.fn(),
          list: vi.fn(() => Promise.resolve([])),
        },
        vector: {
          upsert: vi.fn(),
          search: vi.fn(() =>
            Promise.resolve([
              { id: 'chunk:1', score: 0.9, metadata: { content: 'test content 1' } },
              { id: 'chunk:2', score: 0.8, metadata: { content: 'test content 2' } },
            ]),
          ),
          delete: vi.fn(),
          count: vi.fn(() => Promise.resolve(0)),
        },
        graph: {
          addEntity: vi.fn(),
          addRelation: vi.fn(),
          getEntity: vi.fn(() => Promise.resolve(null)),
          getEntities: vi.fn(() =>
            Promise.resolve([
              {
                id: 'entity1',
                name: 'TestService',
                type: 'SERVICE',
                description: 'Test',
                sourceChunkIds: [],
              },
            ]),
          ),
          getRelations: vi.fn(() => Promise.resolve([])),
          traverse: vi.fn(() =>
            Promise.resolve([
              {
                id: 'related1',
                name: 'RelatedService',
                type: 'SERVICE',
                description: 'Related',
                sourceChunkIds: [],
              },
            ]),
          ),
          findPath: vi.fn(() => Promise.resolve([])),
          deleteEntity: vi.fn(),
          deleteRelation: vi.fn(),
        },
      },
      embedder: {
        dimensions: 384,
        modelName: 'test',
        embed: vi.fn(() => Promise.resolve([0.1, 0.2, 0.3])),
        embedBatch: vi.fn(() => Promise.resolve([[0.1, 0.2, 0.3]])),
      },
      extractor: {
        extractEntities: vi.fn(() =>
          Promise.resolve({
            entities: [{ name: 'QueryEntity', type: 'SERVICE', description: 'From query' }],
            relations: [],
          }),
        ),
      },
    };

    mockOptions = {
      defaultMode: 'hybrid',
      maxResults: 10,
      vectorWeight: 0.7,
      graphWeight: 0.3,
    };

    pipeline = new QueryPipeline(mockConfig, mockOptions);
  });

  describe('search modes', () => {
    it('should perform naive search', async () => {
      const results = await pipeline.search('test query', 'naive', 5);

      expect(mockConfig.embedder.embed).toHaveBeenCalledWith('test query');
      expect(mockConfig.storage.vector.search).toHaveBeenCalledWith([0.1, 0.2, 0.3], 5);
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        id: 'chunk:1',
        content: 'test content 1',
        score: 0.9,
        source: 'vector',
        metadata: { content: 'test content 1' },
      });
    });

    it('should perform local search', async () => {
      // Mock extractor to return entities that match the query
      mockConfig.extractor.extractEntities = vi.fn(() =>
        Promise.resolve({
          entities: [{ name: 'TestService', type: 'SERVICE', description: 'Test service' }],
          relations: [],
        }),
      );

      // Mock vector search to return content that includes entity names
      mockConfig.storage.vector.search = vi.fn(() =>
        Promise.resolve([
          {
            id: 'chunk:1',
            score: 0.9,
            metadata: { content: 'TestService implementation details' },
          },
          { id: 'chunk:2', score: 0.8, metadata: { content: 'unrelated content' } },
        ]),
      );

      const results = await pipeline.search('TestService query', 'local', 5);

      expect(mockConfig.extractor.extractEntities).toHaveBeenCalled();
      expect(mockConfig.storage.graph.traverse).toHaveBeenCalled();
      expect(results).toHaveLength(1); // Only the one with TestService
      expect(results[0].content).toBe('TestService implementation details');
      expect(results[0].metadata).toEqual({ content: 'TestService implementation details' });
    });

    it('should perform global search', async () => {
      const results = await pipeline.search('test query', 'global', 5);

      expect(mockConfig.embedder.embed).toHaveBeenCalledWith('test query');
      expect(results).toHaveLength(2);
      expect(results[0].source).toBe('vector');
    });

    it('should handle global search with null metadata content', async () => {
      // Mock vector search with null/undefined content
      mockConfig.storage.vector.search = vi.fn(() =>
        Promise.resolve([
          { id: 'chunk:1', score: 0.9, metadata: { content: null } },
          { id: 'chunk:2', score: 0.8, metadata: {} },
        ]),
      );

      const results = await pipeline.search('test query', 'global', 5);

      expect(results).toHaveLength(2);
      expect(results[0].content).toBe(''); // null becomes empty string
      expect(results[1].content).toBe(''); // undefined becomes empty string
    });

    it('should perform hybrid search', async () => {
      // Mock different results for local vs global
      let callCount = 0;
      mockConfig.storage.vector.search = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          // Local search call
          return Promise.resolve([
            { id: 'chunk:local', score: 0.9, metadata: { content: 'local result' } },
          ]);
        } else {
          // Global search call
          return Promise.resolve([
            { id: 'chunk:global', score: 0.8, metadata: { content: 'global result' } },
          ]);
        }
      });

      const results = await pipeline.search('test query', 'hybrid', 5);

      expect(results.length).toBeGreaterThan(0);
      expect(mockConfig.embedder.embed).toHaveBeenCalledTimes(2); // Once for local, once for global
    });

    it('should throw error for unknown mode', async () => {
      // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
      await expect(pipeline.search('test', 'unknown' as any, 5)).rejects.toThrow(
        'Unknown query mode: unknown',
      );
    });
  });

  describe('traceDataFlow', () => {
    it('should trace upstream data flow', async () => {
      const entities = await pipeline.traceDataFlow('entity1', 'upstream');

      expect(mockConfig.storage.graph.traverse).toHaveBeenCalledWith('entity1', 10, undefined);
      expect(entities).toHaveLength(1);
      expect(entities[0].name).toBe('RelatedService');
    });

    it('should trace downstream data flow', async () => {
      const entities = await pipeline.traceDataFlow('entity1', 'downstream');

      expect(mockConfig.storage.graph.traverse).toHaveBeenCalledWith('entity1', 10, undefined);
      expect(entities).toHaveLength(1);
    });
  });

  describe('private methods', () => {
    it('should extract entities from query', async () => {
      // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
      const entities = await (pipeline as any).extractEntitiesFromQuery('test query');

      expect(mockConfig.extractor.extractEntities).toHaveBeenCalledWith(
        'test query',
        ['TestService'],
        mockConfig.schema,
      );
      expect(entities).toHaveLength(1);
      expect(entities[0].name).toBe('QueryEntity');
    });

    it('should handle extraction errors gracefully', async () => {
      mockConfig.extractor.extractEntities = vi.fn(() =>
        Promise.reject(new Error('Extraction failed')),
      );

      // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
      const entities = await (pipeline as any).extractEntitiesFromQuery('test query');

      expect(entities).toHaveLength(0);
    });

    it('should get known entities', async () => {
      // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
      const knownEntities = await (pipeline as any).getKnownEntities();

      expect(knownEntities).toEqual(['TestService']);
    });

    it('should merge and deduplicate results', () => {
      const results1 = [
        {
          id: 'chunk:1',
          content: 'content 1',
          score: 0.9,
          source: 'vector' as const,
          metadata: {},
        },
        {
          id: 'chunk:2',
          content: 'content 2',
          score: 0.8,
          source: 'vector' as const,
          metadata: {},
        },
      ];
      const results2 = [
        { id: 'chunk:2', content: 'content 2', score: 0.8, source: 'graph' as const, metadata: {} },
        { id: 'chunk:3', content: 'content 3', score: 0.7, source: 'graph' as const, metadata: {} },
      ];

      // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
      const merged = (pipeline as any).mergeResults(results1, results2);

      expect(merged).toHaveLength(3);
      expect(merged.map((r: SearchResult) => r.id)).toEqual(['chunk:1', 'chunk:2', 'chunk:3']);
      expect(merged[0].score).toBe(0.9); // Sorted by score descending
    });

    it('should handle empty results in merge', () => {
      // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
      const merged = (pipeline as any).mergeResults([], []);

      expect(merged).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty vector search results', async () => {
      mockConfig.storage.vector.search = vi.fn(() => Promise.resolve([]));

      const results = await pipeline.search('test query', 'naive', 5);

      expect(results).toHaveLength(0);
    });

    it('should handle missing metadata content', async () => {
      mockConfig.storage.vector.search = vi.fn(() =>
        Promise.resolve([
          { id: 'chunk:1', score: 0.9, metadata: {} },
          { id: 'chunk:2', score: 0.8, metadata: { content: null } },
        ]),
      );

      const results = await pipeline.search('test query', 'naive', 5);

      expect(results[0].content).toBe('');
      expect(results[1].content).toBe('');
    });

    it('should handle local search with no entities found', async () => {
      mockConfig.extractor.extractEntities = vi.fn(() =>
        Promise.resolve({
          entities: [],
          relations: [],
        }),
      );

      const results = await pipeline.search('test query', 'local', 5);

      expect(results).toHaveLength(0);
    });

    it('should handle local search with empty entity IDs set', async () => {
      // Mock extractor to return entities but graph has no related entities
      mockConfig.extractor.extractEntities = vi.fn(() =>
        Promise.resolve({
          entities: [{ name: 'TestEntity', type: 'SERVICE', description: 'Test' }],
          relations: [],
        }),
      );

      // Mock traverse to return empty array (no related entities)
      mockConfig.storage.graph.traverse = vi.fn(() => Promise.resolve([]));

      // Mock vector search
      mockConfig.storage.vector.search = vi.fn(() =>
        Promise.resolve([{ id: 'chunk:1', score: 0.9, metadata: { content: 'some content' } }]),
      );

      const results = await pipeline.search('test query', 'local', 5);

      // Should filter based on original entity name only
      expect(results).toHaveLength(0); // No content matches 'TestEntity'
    });

    it('should handle local search with no matching content', async () => {
      // Mock extractor to return entities
      mockConfig.extractor.extractEntities = vi.fn(() =>
        Promise.resolve({
          entities: [{ name: 'SpecificEntity', type: 'SERVICE', description: 'Test' }],
          relations: [],
        }),
      );

      // Mock vector search with content that doesn't match any entity
      mockConfig.storage.vector.search = vi.fn(() =>
        Promise.resolve([
          { id: 'chunk:1', score: 0.9, metadata: { content: 'completely unrelated content' } },
          { id: 'chunk:2', score: 0.8, metadata: { content: 'another unrelated text' } },
        ]),
      );

      const results = await pipeline.search('SpecificEntity query', 'local', 5);

      expect(results).toHaveLength(0); // No content matches entity names
    });

    it('should handle local search with null metadata content', async () => {
      // Mock extractor to return entities
      mockConfig.extractor.extractEntities = vi.fn(() =>
        Promise.resolve({
          entities: [{ name: 'TestEntity', type: 'SERVICE', description: 'Test' }],
          relations: [],
        }),
      );

      // Mock vector search with null/undefined content
      mockConfig.storage.vector.search = vi.fn(() =>
        Promise.resolve([
          { id: 'chunk:1', score: 0.9, metadata: { content: null } },
          { id: 'chunk:2', score: 0.8, metadata: {} },
          { id: 'chunk:3', score: 0.7, metadata: { content: undefined } },
        ]),
      );

      const results = await pipeline.search('TestEntity query', 'local', 5);

      expect(results).toHaveLength(0); // No valid content to match
    });
  });

  describe('reranker integration', () => {
    it('should rerank results when reranker is configured', async () => {
      const mockReranker = {
        rerank: vi.fn().mockResolvedValue([
          { id: 'chunk:2', score: 0.99, index: 1 },
          { id: 'chunk:1', score: 0.5, index: 0 },
        ]),
      };

      const configWithReranker = { ...mockConfig, reranker: mockReranker };
      const p = new QueryPipeline(configWithReranker, mockOptions);

      const results = await p.search('test', 'naive', 5);

      expect(mockReranker.rerank).toHaveBeenCalledWith(
        'test',
        expect.arrayContaining([
          expect.objectContaining({ id: 'chunk:1' }),
          expect.objectContaining({ id: 'chunk:2' }),
        ]),
        5,
      );
      expect(results[0].id).toBe('chunk:2');
      expect(results[0].score).toBe(0.99);
    });

    it('should skip reranking when no results', async () => {
      mockConfig.storage.vector.search = vi.fn().mockResolvedValue([]);
      const mockReranker = { rerank: vi.fn() };
      const configWithReranker = { ...mockConfig, reranker: mockReranker };
      const p = new QueryPipeline(configWithReranker, mockOptions);

      await p.search('test', 'naive', 5);

      expect(mockReranker.rerank).not.toHaveBeenCalled();
    });

    it('should not rerank when no reranker configured', async () => {
      const results = await pipeline.search('test', 'naive', 5);
      expect(results).toHaveLength(2);
      expect(results[0].score).toBe(0.9); // Original score preserved
    });
  });
});
