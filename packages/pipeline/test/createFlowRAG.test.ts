import { promises as fs } from 'node:fs';

import { defineSchema } from '@flowrag/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createFlowRAG } from '../src/index.js';

// Mock all dependencies
vi.mock('@flowrag/core');
vi.mock('tiktoken', () => ({
  encoding_for_model: vi.fn(() => ({
    encode: vi.fn((text: string) => new Array(text.length).fill(0).map((_, i) => i)),
    decode: vi.fn((tokens: number[]) =>
      tokens.map((t) => String.fromCharCode(65 + (t % 26))).join(''),
    ),
    free: vi.fn(),
  })),
}));

describe('createFlowRAG', () => {
  // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
  let mockStorage: any;
  // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
  let mockEmbedder: any;
  // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
  let mockExtractor: any;
  // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
  let schema: any;

  beforeEach(() => {
    vi.clearAllMocks();

    schema = defineSchema({
      entityTypes: ['SERVICE', 'DATABASE'],
      relationTypes: ['USES', 'CONNECTS'],
    });

    mockStorage = {
      kv: {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
        list: vi.fn(() => Promise.resolve([])),
      },
      vector: {
        upsert: vi.fn(),
        search: vi.fn(() => Promise.resolve([])),
        delete: vi.fn(),
        count: vi.fn(() => Promise.resolve(0)),
      },
      graph: {
        addEntity: vi.fn(),
        addRelation: vi.fn(),
        getEntity: vi.fn(() => Promise.resolve(null)),
        getEntities: vi.fn(() => Promise.resolve([])),
        getRelations: vi.fn(() => Promise.resolve([])),
        traverse: vi.fn(() => Promise.resolve([])),
        findPath: vi.fn(() => Promise.resolve([])),
        deleteEntity: vi.fn(),
        deleteRelation: vi.fn(),
      },
    };

    mockEmbedder = {
      dimensions: 384,
      modelName: 'test-model',
      embed: vi.fn(() => Promise.resolve([0.1, 0.2, 0.3])),
    };

    mockExtractor = {
      extractEntities: vi.fn(() =>
        Promise.resolve({
          entities: [],
          relations: [],
        }),
      ),
    };
  });

  it('should create FlowRAG instance with default options', () => {
    const rag = createFlowRAG({
      schema,
      storage: mockStorage,
      embedder: mockEmbedder,
      extractor: mockExtractor,
    });

    expect(rag).toBeDefined();
    expect(typeof rag.index).toBe('function');
    expect(typeof rag.search).toBe('function');
    expect(typeof rag.stats).toBe('function');
  });

  it('should handle search with different modes', async () => {
    const rag = createFlowRAG({
      schema,
      storage: mockStorage,
      embedder: mockEmbedder,
      extractor: mockExtractor,
    });

    mockStorage.vector.search.mockResolvedValue([
      { id: 'test', score: 0.9, metadata: { content: 'test content' } },
    ]);

    const results = await rag.search('test query', { mode: 'naive' });

    expect(results).toHaveLength(1);
    expect(results[0].content).toBe('test content');
    expect(mockEmbedder.embed).toHaveBeenCalledWith('test query');
  });

  it('should return stats', async () => {
    const rag = createFlowRAG({
      schema,
      storage: mockStorage,
      embedder: mockEmbedder,
      extractor: mockExtractor,
    });

    mockStorage.kv.list.mockImplementation((prefix: string) => {
      if (prefix === 'doc:') return Promise.resolve(['doc:1', 'doc:2']);
      if (prefix === 'chunk:') return Promise.resolve(['chunk:1']);
      return Promise.resolve([]);
    });

    const stats = await rag.stats();

    expect(stats.documents).toBe(2);
    expect(stats.chunks).toBe(1);
    expect(stats.entities).toBe(0);
    expect(stats.vectors).toBe(0);
  });

  it('should handle index with array input', async () => {
    const rag = createFlowRAG({
      schema,
      storage: mockStorage,
      embedder: mockEmbedder,
      extractor: mockExtractor,
    });

    // Create test files
    await fs.writeFile('/tmp/test1.txt', 'test content 1');
    await fs.writeFile('/tmp/test2.txt', 'test content 2');

    try {
      await rag.index(['/tmp/test1.txt', '/tmp/test2.txt']);

      // Verify storage was called
      expect(mockStorage.kv.set).toHaveBeenCalled();
    } finally {
      // Cleanup
      await fs.unlink('/tmp/test1.txt').catch(() => {});
      await fs.unlink('/tmp/test2.txt').catch(() => {});
    }
  });

  it('should handle index with string input', async () => {
    const rag = createFlowRAG({
      schema,
      storage: mockStorage,
      embedder: mockEmbedder,
      extractor: mockExtractor,
    });

    // Create test file
    await fs.writeFile('/tmp/single-test.txt', 'single test content');

    try {
      await rag.index('/tmp/single-test.txt');

      // Verify storage was called
      expect(mockStorage.kv.set).toHaveBeenCalled();
    } finally {
      // Cleanup
      await fs.unlink('/tmp/single-test.txt').catch(() => {});
    }
  });

  it('should call onEntitiesExtracted hook during indexing', async () => {
    const hook = vi.fn((extraction) => Promise.resolve(extraction));

    mockExtractor.extractEntities.mockResolvedValue({
      entities: [{ name: 'TestService', type: 'SERVICE', description: 'A test service' }],
      relations: [],
    });

    const rag = createFlowRAG({
      schema,
      storage: mockStorage,
      embedder: mockEmbedder,
      extractor: mockExtractor,
      hooks: { onEntitiesExtracted: hook },
    });

    await fs.writeFile('/tmp/hook-test.txt', 'hook test content');

    try {
      await rag.index('/tmp/hook-test.txt');

      expect(hook).toHaveBeenCalledWith(
        {
          entities: [{ name: 'TestService', type: 'SERVICE', description: 'A test service' }],
          relations: [],
        },
        expect.objectContaining({
          documentId: expect.any(String),
          chunkId: expect.any(String),
          content: expect.any(String),
        }),
      );
      expect(mockStorage.graph.addEntity).toHaveBeenCalled();
    } finally {
      await fs.unlink('/tmp/hook-test.txt').catch(() => {});
    }
  });

  it('should use modified extraction from hook', async () => {
    mockExtractor.extractEntities.mockResolvedValue({
      entities: [{ name: 'Original', type: 'SERVICE', description: 'Original entity' }],
      relations: [],
    });

    const hook = vi.fn(() =>
      Promise.resolve({
        entities: [{ name: 'Modified', type: 'DATABASE', description: 'Modified entity' }],
        relations: [],
      }),
    );

    const rag = createFlowRAG({
      schema,
      storage: mockStorage,
      embedder: mockEmbedder,
      extractor: mockExtractor,
      hooks: { onEntitiesExtracted: hook },
    });

    await fs.writeFile('/tmp/hook-modify-test.txt', 'modify test content');

    try {
      await rag.index('/tmp/hook-modify-test.txt');

      expect(mockStorage.graph.addEntity).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Modified', type: 'DATABASE' }),
      );
    } finally {
      await fs.unlink('/tmp/hook-modify-test.txt').catch(() => {});
    }
  });

  it('should handle traceDataFlow', async () => {
    const rag = createFlowRAG({
      schema,
      storage: mockStorage,
      embedder: mockEmbedder,
      extractor: mockExtractor,
    });

    mockStorage.graph.getEntity.mockResolvedValue({
      id: 'entity1',
      name: 'Entity1',
      type: 'SERVICE',
      description: 'Test',
      sourceChunkIds: [],
    });
    mockStorage.graph.getRelations.mockResolvedValue([]);

    const result = await rag.traceDataFlow('entity1', 'upstream');

    // Should call getRelations with 'in' for upstream
    expect(mockStorage.graph.getRelations).toHaveBeenCalledWith('entity1', 'in');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('entity1');
  });

  it('should handle findPath', async () => {
    const rag = createFlowRAG({
      schema,
      storage: mockStorage,
      embedder: mockEmbedder,
      extractor: mockExtractor,
    });

    await rag.findPath('entity1', 'entity2');

    expect(mockStorage.graph.findPath).toHaveBeenCalledWith('entity1', 'entity2', 5);
  });

  it('should handle findPath with custom maxDepth', async () => {
    const rag = createFlowRAG({
      schema,
      storage: mockStorage,
      embedder: mockEmbedder,
      extractor: mockExtractor,
    });

    await rag.findPath('entity1', 'entity2', 10);

    expect(mockStorage.graph.findPath).toHaveBeenCalledWith('entity1', 'entity2', 10);
  });

  it('should expose deleteDocument', async () => {
    const rag = createFlowRAG({
      schema,
      storage: mockStorage,
      embedder: mockEmbedder,
      extractor: mockExtractor,
    });

    mockStorage.kv.list = vi.fn().mockResolvedValue([]);
    mockStorage.graph.getEntities = vi.fn().mockResolvedValue([]);

    await rag.deleteDocument('doc:test');

    expect(mockStorage.kv.delete).toHaveBeenCalledWith('doc:test');
    expect(mockStorage.kv.delete).toHaveBeenCalledWith('docHash:doc:test');
  });

  it('should use custom indexing options', () => {
    const rag = createFlowRAG({
      schema,
      storage: mockStorage,
      embedder: mockEmbedder,
      extractor: mockExtractor,
      options: {
        indexing: {
          chunkSize: 2000,
          chunkOverlap: 200,
          maxParallelInsert: 4,
        },
      },
    });

    expect(rag).toBeDefined();
    // Options are used internally by IndexingPipeline
  });

  it('should use custom querying options', async () => {
    const rag = createFlowRAG({
      schema,
      storage: mockStorage,
      embedder: mockEmbedder,
      extractor: mockExtractor,
      options: {
        querying: {
          defaultMode: 'local',
          maxResults: 20,
          vectorWeight: 0.8,
          graphWeight: 0.2,
        },
      },
    });

    // Mock extractor to return entities for local search
    mockExtractor.extractEntities.mockResolvedValue({
      entities: [{ name: 'TestEntity', type: 'SERVICE', description: 'Test' }],
      relations: [],
    });

    // Mock vector search to return results that match entity filtering
    mockStorage.vector.search.mockResolvedValue([
      { id: 'test', score: 0.9, metadata: { content: 'TestEntity implementation' } },
    ]);

    const results = await rag.search('test query'); // Should use 'local' mode by default

    expect(results).toHaveLength(1);
    expect(results[0].content).toBe('TestEntity implementation');
  });

  it('should handle stats with relations count', async () => {
    const rag = createFlowRAG({
      schema,
      storage: mockStorage,
      embedder: mockEmbedder,
      extractor: mockExtractor,
    });

    mockStorage.kv.list.mockResolvedValue([]);
    mockStorage.graph.getEntities.mockResolvedValue([
      { id: 'entity1', name: 'Entity1', type: 'SERVICE', description: 'Test' },
      { id: 'entity2', name: 'Entity2', type: 'SERVICE', description: 'Test' },
    ]);
    mockStorage.graph.getRelations.mockImplementation((entityId: string) => {
      if (entityId === 'entity1') return Promise.resolve([{ id: 'rel1' }, { id: 'rel2' }]);
      if (entityId === 'entity2') return Promise.resolve([{ id: 'rel3' }]);
      return Promise.resolve([]);
    });

    const stats = await rag.stats();

    expect(stats.relations).toBe(3); // 2 + 1 relations
  });
});
