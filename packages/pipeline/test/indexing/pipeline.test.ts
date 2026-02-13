import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexingPipeline } from '../../src/indexing/pipeline.js';
import type { FlowRAGConfig, IndexingOptions } from '../../src/types.js';

// Mock dependencies
vi.mock('../../src/indexing/scanner.js');
vi.mock('../../src/indexing/chunker.js');

describe('IndexingPipeline', () => {
  let pipeline: IndexingPipeline;
  let mockConfig: FlowRAGConfig;
  let mockOptions: Required<IndexingOptions>;

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
            entities: [{ name: 'TestEntity', type: 'SERVICE', description: 'Test' }],
            relations: [
              { source: 'A', target: 'B', type: 'USES', description: 'Test', keywords: [] },
            ],
          }),
        ),
      },
    };

    mockOptions = {
      chunkSize: 10,
      chunkOverlap: 2,
      maxParallelInsert: 1,
      llmMaxAsync: 1,
      embeddingMaxAsync: 1,
    };

    pipeline = new IndexingPipeline(mockConfig, mockOptions);
  });

  afterEach(() => {
    pipeline.dispose();
  });

  it('should process single input file', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
    const mockScanner = (pipeline as any).scanner;
    // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
    const mockChunker = (pipeline as any).chunker;

    mockScanner.scanFiles = vi.fn(() =>
      Promise.resolve([
        {
          id: 'doc:test',
          content: 'test content',
          metadata: { path: '/test.txt' },
        },
      ]),
    );

    mockChunker.chunkDocument = vi.fn(() => [
      {
        id: 'doc:test:chunk:0',
        content: 'test content',
        documentId: 'doc:test',
        startToken: 0,
        endToken: 10,
      },
    ]);

    await pipeline.process(['/test.txt']);

    expect(mockScanner.scanFiles).toHaveBeenCalledWith(['/test.txt']);
    expect(mockConfig.storage.kv.set).toHaveBeenCalledWith('doc:test', expect.any(Object));
    expect(mockConfig.embedder.embed).toHaveBeenCalledWith('test content');
    expect(mockConfig.storage.vector.upsert).toHaveBeenCalled();
  });

  it('should process multiple input files', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
    const mockScanner = (pipeline as any).scanner;
    // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
    const mockChunker = (pipeline as any).chunker;

    mockScanner.scanFiles = vi.fn(() =>
      Promise.resolve([
        { id: 'doc:1', content: 'content 1', metadata: { path: '/1.txt' } },
        { id: 'doc:2', content: 'content 2', metadata: { path: '/2.txt' } },
      ]),
    );

    mockChunker.chunkDocument = vi.fn(() => [
      { id: 'chunk:1', content: 'content', documentId: 'doc:1', startToken: 0, endToken: 5 },
    ]);

    await pipeline.process(['/1.txt', '/2.txt']);

    // 2 docs + 2 chunks + 2 cache entries + 2 docHashes = 8 calls
    expect(mockConfig.storage.kv.set).toHaveBeenCalledTimes(8);
  });

  it('should use LLM cache when available', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
    const mockScanner = (pipeline as any).scanner;
    // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
    const mockChunker = (pipeline as any).chunker;

    mockScanner.scanFiles = vi.fn(() =>
      Promise.resolve([{ id: 'doc:test', content: 'test', metadata: { path: '/test.txt' } }]),
    );

    mockChunker.chunkDocument = vi.fn(() => [
      { id: 'chunk:1', content: 'test', documentId: 'doc:test', startToken: 0, endToken: 5 },
    ]);

    // Mock cache hit
    mockConfig.storage.kv.get = vi.fn().mockResolvedValue({
      entities: [{ name: 'CachedEntity', type: 'SERVICE', description: 'Cached' }],
      relations: [],
    });

    await pipeline.process(['/test.txt']);

    expect(mockConfig.extractor.extractEntities).not.toHaveBeenCalled();
    expect(mockConfig.storage.graph.addEntity).toHaveBeenCalledWith({
      id: 'CachedEntity',
      name: 'CachedEntity',
      type: 'SERVICE',
      description: 'Cached',
      sourceChunkIds: ['chunk:1'],
    });
  });

  it('should extract entities when cache miss', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
    const mockScanner = (pipeline as any).scanner;
    // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
    const mockChunker = (pipeline as any).chunker;

    mockScanner.scanFiles = vi.fn(() =>
      Promise.resolve([{ id: 'doc:test', content: 'test', metadata: { path: '/test.txt' } }]),
    );

    mockChunker.chunkDocument = vi.fn(() => [
      { id: 'chunk:1', content: 'test', documentId: 'doc:test', startToken: 0, endToken: 5 },
    ]);

    // Mock cache miss
    mockConfig.storage.kv.get = vi.fn(() => Promise.resolve(null));

    await pipeline.process(['/test.txt']);

    expect(mockConfig.extractor.extractEntities).toHaveBeenCalledWith(
      'test',
      [],
      mockConfig.schema,
    );
    expect(mockConfig.storage.kv.set).toHaveBeenCalledWith(
      expect.stringMatching(/^extraction:/),
      expect.any(Object),
    );
  });

  it('should handle batching correctly', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
    const _mockScanner = (pipeline as any).scanner;
    // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
    const _mockChunker = (pipeline as any).chunker;

    // Create pipeline with batch size 2
    const batchPipeline = new IndexingPipeline(mockConfig, {
      ...mockOptions,
      maxParallelInsert: 2,
    });

    // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
    const mockBatchScanner = (batchPipeline as any).scanner;
    // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
    const mockBatchChunker = (batchPipeline as any).chunker;

    mockBatchScanner.scanFiles = vi.fn(() =>
      Promise.resolve([
        { id: 'doc:1', content: 'test 1', metadata: { path: '/1.txt' } },
        { id: 'doc:2', content: 'test 2', metadata: { path: '/2.txt' } },
        { id: 'doc:3', content: 'test 3', metadata: { path: '/3.txt' } },
      ]),
    );

    mockBatchChunker.chunkDocument = vi.fn(() => [
      { id: 'chunk:1', content: 'test', documentId: 'doc:1', startToken: 0, endToken: 5 },
    ]);

    await batchPipeline.process(['/1.txt', '/2.txt', '/3.txt']);

    // 3 docs + 3 chunks + 3 cache entries + 3 docHashes = 12 calls
    expect(mockConfig.storage.kv.set).toHaveBeenCalledTimes(12);

    batchPipeline.dispose();
  });

  it('should get known entities for extraction', async () => {
    mockConfig.storage.graph.getEntities = vi.fn(() =>
      Promise.resolve([
        {
          id: 'entity1',
          name: 'Entity1',
          type: 'SERVICE',
          description: 'Test',
          sourceChunkIds: [],
        },
        {
          id: 'entity2',
          name: 'Entity2',
          type: 'SERVICE',
          description: 'Test',
          sourceChunkIds: [],
        },
      ]),
    );

    // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
    const knownEntities = await (pipeline as any).getKnownEntities();

    expect(knownEntities).toEqual(['Entity1', 'Entity2']);
  });

  it('should generate consistent hash for content', () => {
    // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
    const hash1 = (pipeline as any).hashContent('test content');
    // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
    const hash2 = (pipeline as any).hashContent('test content');
    // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
    const hash3 = (pipeline as any).hashContent('different content');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });

  it('should create batches correctly', () => {
    const items = [1, 2, 3, 4, 5];
    // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
    const batches = (pipeline as any).createBatches(items, 2);

    expect(batches).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('should skip unchanged documents on re-index', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
    const mockScanner = (pipeline as any).scanner;
    // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
    const mockChunker = (pipeline as any).chunker;

    mockScanner.scanFiles = vi
      .fn()
      .mockResolvedValue([
        { id: 'doc:test', content: 'same content', metadata: { path: '/test.txt' } },
      ]);
    mockChunker.chunkDocument = vi.fn(() => [
      {
        id: 'doc:test:chunk:0',
        content: 'same content',
        documentId: 'doc:test',
        startToken: 0,
        endToken: 5,
      },
    ]);

    // First index: no stored hash → processes
    mockConfig.storage.kv.get = vi.fn().mockResolvedValue(null);
    await pipeline.process(['/test.txt']);
    expect(mockConfig.storage.kv.set).toHaveBeenCalled();

    // Second index: hash matches → skips
    const setCalls = vi.mocked(mockConfig.storage.kv.set).mock.calls;
    const storedHash = setCalls.find(([key]) => (key as string).startsWith('docHash:'))?.[1];

    mockConfig.storage.kv.set = vi.fn().mockResolvedValue(undefined);
    mockConfig.storage.kv.get = vi
      .fn()
      .mockImplementation((key: string) =>
        key.startsWith('docHash:') ? Promise.resolve(storedHash) : Promise.resolve(null),
      );

    await pipeline.process(['/test.txt']);
    expect(mockConfig.storage.kv.set).not.toHaveBeenCalled();

    // Third index with force: processes even if hash matches
    await pipeline.process(['/test.txt'], true);
    expect(mockConfig.storage.kv.set).toHaveBeenCalled();
  });

  it('should pass custom fields from extraction to storage', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
    const mockScanner = (pipeline as any).scanner;
    // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
    const mockChunker = (pipeline as any).chunker;
    mockScanner.scanFiles = vi
      .fn()
      .mockResolvedValue([{ id: 'doc:test', content: 'test', metadata: { path: '/test.txt' } }]);
    mockChunker.chunkDocument = vi.fn(() => [
      {
        id: 'doc:test:chunk:0',
        content: 'test',
        documentId: 'doc:test',
        startToken: 0,
        endToken: 5,
      },
    ]);
    mockConfig.storage.kv.get = vi.fn().mockResolvedValue(null);
    mockConfig.extractor.extractEntities = vi.fn().mockResolvedValue({
      entities: [
        { name: 'Svc', type: 'SERVICE', description: 'svc', fields: { status: 'active' } },
      ],
      relations: [
        {
          source: 'Svc',
          target: 'DB',
          type: 'USES',
          description: 'uses',
          keywords: ['db'],
          fields: { syncType: 'async' },
        },
      ],
    });

    await pipeline.process(['/test.txt']);

    expect(mockConfig.storage.graph.addEntity).toHaveBeenCalledWith(
      expect.objectContaining({ fields: { status: 'active' } }),
    );
    expect(mockConfig.storage.graph.addRelation).toHaveBeenCalledWith(
      expect.objectContaining({ fields: { syncType: 'async' } }),
    );
  });
});
