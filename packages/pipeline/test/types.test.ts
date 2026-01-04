import { describe, expect, it } from 'vitest';

import type {
  Chunk,
  Document,
  FlowRAG,
  FlowRAGConfig,
  IndexingOptions,
  QueryMode,
  QueryOptions,
  SearchResult,
} from '../src/types.js';

describe('Types', () => {
  it('should define Document type correctly', () => {
    const document: Document = {
      id: 'doc:test',
      content: 'test content',
      metadata: {
        path: '/test.txt',
        extension: '.txt',
        scannedAt: '2024-01-01T00:00:00Z',
      },
    };

    expect(document.id).toBe('doc:test');
    expect(document.content).toBe('test content');
    expect(document.metadata?.path).toBe('/test.txt');
  });

  it('should define Chunk type correctly', () => {
    const chunk: Chunk = {
      id: 'doc:test:chunk:0',
      content: 'chunk content',
      documentId: 'doc:test',
      startToken: 0,
      endToken: 10,
    };

    expect(chunk.id).toBe('doc:test:chunk:0');
    expect(chunk.documentId).toBe('doc:test');
    expect(chunk.startToken).toBe(0);
    expect(chunk.endToken).toBe(10);
  });

  it('should define SearchResult type correctly', () => {
    const result: SearchResult = {
      id: 'chunk:1',
      content: 'result content',
      score: 0.95,
      source: 'vector',
      metadata: { extra: 'data' },
    };

    expect(result.source).toBe('vector');
    expect(result.score).toBe(0.95);
  });

  it('should define QueryMode union correctly', () => {
    const modes: QueryMode[] = ['naive', 'local', 'global', 'hybrid'];

    expect(modes).toHaveLength(4);
    expect(modes).toContain('naive');
    expect(modes).toContain('hybrid');
  });

  it('should define IndexingOptions with defaults', () => {
    const options: IndexingOptions = {
      chunkSize: 1200,
      maxParallelInsert: 2,
    };

    expect(options.chunkSize).toBe(1200);
    expect(options.maxParallelInsert).toBe(2);
  });

  it('should define QueryOptions with defaults', () => {
    const options: QueryOptions = {
      defaultMode: 'hybrid',
      vectorWeight: 0.7,
    };

    expect(options.defaultMode).toBe('hybrid');
    expect(options.vectorWeight).toBe(0.7);
  });

  it('should define FlowRAGConfig interface', () => {
    const config: FlowRAGConfig = {
      schema: {
        entityTypes: ['SERVICE'],
        relationTypes: ['USES'],
        isValidEntityType: () => true,
        isValidRelationType: () => true,
        normalizeEntityType: (type) => type,
        normalizeRelationType: (type) => type,
      },
      storage: {
        kv: {
          get: async () => null,
          set: async () => {},
          delete: async () => {},
          list: async () => [],
          clear: async () => {},
        },
        vector: {
          upsert: async () => {},
          search: async () => [],
          delete: async () => {},
          count: async () => 0,
        },
        graph: {
          addEntity: async () => {},
          addRelation: async () => {},
          getEntity: async () => null,
          getEntities: async () => [],
          getRelations: async () => [],
          traverse: async () => [],
          findPath: async () => [],
          deleteEntity: async () => {},
          deleteRelation: async () => {},
        },
      },
      embedder: {
        dimensions: 384,
        modelName: 'test',
        embed: async () => [],
        embedBatch: async () => [[]],
      },
      extractor: {
        extractEntities: async () => ({ entities: [], relations: [] }),
      },
    };

    expect(config.schema.entityTypes).toContain('SERVICE');
    expect(config.embedder.dimensions).toBe(384);
  });

  it('should define FlowRAG interface methods', () => {
    // This is more of a compile-time check, but we can verify the interface exists
    const mockFlowRAG: FlowRAG = {
      index: async () => {},
      search: async () => [],
      traceDataFlow: async () => [],
      findPath: async () => [],
      stats: async () => ({
        documents: 0,
        chunks: 0,
        entities: 0,
        relations: 0,
        vectors: 0,
      }),
    };

    expect(typeof mockFlowRAG.index).toBe('function');
    expect(typeof mockFlowRAG.search).toBe('function');
    expect(typeof mockFlowRAG.traceDataFlow).toBe('function');
    expect(typeof mockFlowRAG.findPath).toBe('function');
    expect(typeof mockFlowRAG.stats).toBe('function');
  });
});
