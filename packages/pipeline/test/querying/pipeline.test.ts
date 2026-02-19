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
          getEntity: vi.fn((id: string) =>
            Promise.resolve({
              id,
              name: id,
              type: 'SERVICE',
              description: 'Test',
              sourceChunkIds: [],
            }),
          ),
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
        sources: [{ documentId: '', chunkIndex: 1, filePath: undefined }],
        metadata: { content: 'test content 1' },
      });
    });

    it('should include filePath in sources when documentId is a doc: ID', async () => {
      const filePath = '/content/test.md';
      const docId = `doc:${Buffer.from(filePath).toString('base64url')}`;

      mockConfig.storage.vector.search = vi
        .fn()
        .mockResolvedValue([
          { id: `chunk:${docId}:3`, score: 0.9, metadata: { content: 'text', documentId: docId } },
        ]);

      const results = await pipeline.search('query', 'naive', 5);

      expect(results[0].sources).toEqual([
        { documentId: docId, filePath: '/content/test.md', chunkIndex: 3 },
      ]);
    });

    it('should perform local search with entity boosting', async () => {
      mockConfig.extractor.extractEntities = vi.fn(() =>
        Promise.resolve({
          entities: [{ name: 'TestService', type: 'SERVICE', description: 'Test service' }],
          relations: [],
        }),
      );

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
      // Both returned but entity-matching result has higher boosted score
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].content).toBe('TestService implementation details');
      expect(results[0].score).toBeGreaterThan(results[results.length - 1].score);
    });

    it('should perform global search with keyword enrichment', async () => {
      mockConfig.storage.graph.getRelations = vi.fn(() =>
        Promise.resolve([
          {
            id: 'r1',
            sourceId: 'a',
            targetId: 'b',
            type: 'USES',
            description: '',
            keywords: ['auth', 'security'],
            sourceChunkIds: [],
          },
        ]),
      );

      const results = await pipeline.search('test query', 'global', 5);

      // Embed should be called with enriched query
      expect(mockConfig.embedder.embed).toHaveBeenCalled();
      expect(results).toHaveLength(2);
      expect(results[0].source).toBe('vector');
    });

    it('should handle global search with null metadata content', async () => {
      mockConfig.storage.vector.search = vi.fn(() =>
        Promise.resolve([
          { id: 'chunk:1', score: 0.9, metadata: { content: null } },
          { id: 'chunk:2', score: 0.8, metadata: {} },
        ]),
      );

      const results = await pipeline.search('test query', 'global', 5);

      expect(results).toHaveLength(2);
      expect(results[0].content).toBe('');
      expect(results[1].content).toBe('');
    });

    it('should perform hybrid search', async () => {
      let callCount = 0;
      mockConfig.storage.vector.search = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve([
            { id: 'chunk:local', score: 0.9, metadata: { content: 'local result' } },
          ]);
        }
        return Promise.resolve([
          { id: 'chunk:global', score: 0.8, metadata: { content: 'global result' } },
        ]);
      });

      const results = await pipeline.search('test query', 'hybrid', 5);

      expect(results.length).toBeGreaterThan(0);
      expect(mockConfig.embedder.embed).toHaveBeenCalledTimes(2);
    });

    it('should throw error for unknown mode', async () => {
      // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
      await expect(pipeline.search('test', 'unknown' as any, 5)).rejects.toThrow(
        'Unknown query mode: unknown',
      );
    });
  });

  describe('traceDataFlow', () => {
    it('should trace upstream data flow using incoming relations', async () => {
      mockConfig.storage.graph.getRelations = vi.fn(() =>
        Promise.resolve([
          {
            id: 'r1',
            sourceId: 'upstream1',
            targetId: 'entity1',
            type: 'USES',
            description: '',
            keywords: [],
            sourceChunkIds: [],
          },
        ]),
      );

      const entities = await pipeline.traceDataFlow('entity1', 'upstream');

      // Should use 'in' direction for upstream
      expect(mockConfig.storage.graph.getRelations).toHaveBeenCalledWith('entity1', 'in');
      expect(entities.length).toBeGreaterThanOrEqual(1);
    });

    it('should trace downstream data flow using outgoing relations', async () => {
      mockConfig.storage.graph.getRelations = vi.fn(() =>
        Promise.resolve([
          {
            id: 'r1',
            sourceId: 'entity1',
            targetId: 'downstream1',
            type: 'USES',
            description: '',
            keywords: [],
            sourceChunkIds: [],
          },
        ]),
      );

      const entities = await pipeline.traceDataFlow('entity1', 'downstream');

      // Should use 'out' direction for downstream
      expect(mockConfig.storage.graph.getRelations).toHaveBeenCalledWith('entity1', 'out');
      expect(entities.length).toBeGreaterThanOrEqual(1);
    });

    it('should skip null entities during traversal', async () => {
      mockConfig.storage.graph.getEntity = vi.fn(() => Promise.resolve(null));
      mockConfig.storage.graph.getRelations = vi.fn(() => Promise.resolve([]));

      const entities = await pipeline.traceDataFlow('missing', 'downstream');

      expect(entities).toHaveLength(0);
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
      expect(merged[0].score).toBe(0.9);
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
        Promise.resolve({ entities: [], relations: [] }),
      );

      const results = await pipeline.search('test query', 'local', 5);

      // With no entities, all results get penalized score (0.5x) but still returned
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBeLessThan(0.9); // Penalized
    });

    it('should handle local search with no matching content', async () => {
      mockConfig.extractor.extractEntities = vi.fn(() =>
        Promise.resolve({
          entities: [{ name: 'SpecificEntity', type: 'SERVICE', description: 'Test' }],
          relations: [],
        }),
      );

      mockConfig.storage.vector.search = vi.fn(() =>
        Promise.resolve([
          { id: 'chunk:1', score: 0.9, metadata: { content: 'completely unrelated content' } },
          { id: 'chunk:2', score: 0.8, metadata: { content: 'another unrelated text' } },
        ]),
      );

      const results = await pipeline.search('SpecificEntity query', 'local', 5);

      // Results returned but with penalized scores (no entity matches)
      expect(results.length).toBeGreaterThan(0);
      for (const r of results) {
        expect(r.score).toBeLessThan(0.9); // All penalized
      }
    });

    it('should handle local search with null metadata content', async () => {
      mockConfig.extractor.extractEntities = vi.fn(() =>
        Promise.resolve({
          entities: [{ name: 'TestEntity', type: 'SERVICE', description: 'Test' }],
          relations: [],
        }),
      );

      mockConfig.storage.vector.search = vi.fn(() =>
        Promise.resolve([
          { id: 'chunk:1', score: 0.9, metadata: { content: null } },
          { id: 'chunk:2', score: 0.8, metadata: {} },
          { id: 'chunk:3', score: 0.7, metadata: { content: undefined } },
        ]),
      );

      const results = await pipeline.search('TestEntity query', 'local', 5);

      // Results returned with penalized scores (no content to match)
      expect(results.length).toBeGreaterThan(0);
      for (const r of results) {
        expect(r.content).toBe('');
      }
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
      expect(results[0].score).toBe(0.9);
    });
  });
});
