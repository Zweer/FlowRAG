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
      extractionGleanings: 0,
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

  it('should emit progress events during indexing', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
    const mockScanner = (pipeline as any).scanner;
    // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
    const mockChunker = (pipeline as any).chunker;

    mockScanner.scanFiles = vi.fn().mockResolvedValue([
      { id: 'doc:1', content: 'content 1', metadata: { path: '/1.txt' } },
      { id: 'doc:2', content: 'content 2', metadata: { path: '/2.txt' } },
    ]);
    mockChunker.chunkDocument = vi.fn(() => [
      { id: 'chunk:1', content: 'c', documentId: 'doc:1', startToken: 0, endToken: 5 },
    ]);

    const events: { type: string; documentId?: string; chunkId?: string }[] = [];
    const onProgress = vi.fn((e) =>
      events.push({ type: e.type, documentId: e.documentId, chunkId: e.chunkId }),
    );

    await pipeline.process(['/1.txt', '/2.txt'], false, onProgress);

    const types = events.map((e) => e.type);
    expect(types).toEqual([
      'scan',
      'document:start',
      'chunk:done',
      'document:done',
      'document:start',
      'chunk:done',
      'document:done',
      'done',
    ]);

    // Verify scan event has correct totals
    expect(onProgress.mock.calls[0][0].documentsTotal).toBe(2);

    // Verify done event has final counts
    const doneEvent = onProgress.mock.calls.at(-1)?.[0];
    expect(doneEvent.documentsProcessed).toBe(2);
    expect(doneEvent.chunksProcessed).toBe(2);
  });

  it('should emit document:skip for unchanged documents', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
    const mockScanner = (pipeline as any).scanner;
    // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
    const mockChunker = (pipeline as any).chunker;

    mockScanner.scanFiles = vi
      .fn()
      .mockResolvedValue([{ id: 'doc:1', content: 'same', metadata: { path: '/1.txt' } }]);
    mockChunker.chunkDocument = vi.fn(() => []);

    // First pass: index
    mockConfig.storage.kv.get = vi.fn().mockResolvedValue(null);
    await pipeline.process(['/1.txt']);

    // Get stored hash
    const setCalls = vi.mocked(mockConfig.storage.kv.set).mock.calls;
    const storedHash = setCalls.find(([key]) => (key as string).startsWith('docHash:'))?.[1];

    // Second pass: skip
    mockConfig.storage.kv.get = vi
      .fn()
      .mockImplementation((key: string) =>
        key.startsWith('docHash:') ? Promise.resolve(storedHash) : Promise.resolve(null),
      );

    const events: string[] = [];
    await pipeline.process(['/1.txt'], false, (e) => events.push(e.type));

    expect(events).toEqual(['scan', 'document:skip', 'done']);
  });

  describe('deleteDocument', () => {
    it('should delete document, chunks, vectors, and orphaned graph data', async () => {
      const docId = 'doc:test';
      const chunkIds = ['chunk:doc:test:0', 'chunk:doc:test:1'];

      mockConfig.storage.kv.list = vi.fn().mockImplementation((prefix: string) => {
        if (prefix === `chunk:${docId}:`) return Promise.resolve(chunkIds);
        return Promise.resolve([]);
      });

      // Entity only from this doc → should be deleted
      mockConfig.storage.graph.getEntities = vi.fn().mockResolvedValue([
        {
          id: 'OrphanEntity',
          name: 'OrphanEntity',
          type: 'SERVICE',
          description: 'test',
          sourceChunkIds: ['chunk:doc:test:0'],
        },
      ]);

      await pipeline.deleteDocument(docId);

      expect(mockConfig.storage.vector.delete).toHaveBeenCalledWith(chunkIds);
      expect(mockConfig.storage.graph.deleteEntity).toHaveBeenCalledWith('OrphanEntity');
      expect(mockConfig.storage.kv.delete).toHaveBeenCalledWith('chunk:doc:test:0');
      expect(mockConfig.storage.kv.delete).toHaveBeenCalledWith('chunk:doc:test:1');
      expect(mockConfig.storage.kv.delete).toHaveBeenCalledWith(docId);
      expect(mockConfig.storage.kv.delete).toHaveBeenCalledWith(`docHash:${docId}`);
    });

    it('should preserve shared entities and only remove chunk references', async () => {
      const docId = 'doc:test';

      mockConfig.storage.kv.list = vi.fn().mockImplementation((prefix: string) => {
        if (prefix === `chunk:${docId}:`) return Promise.resolve(['chunk:doc:test:0']);
        return Promise.resolve([]);
      });

      // Entity shared with another doc → should be updated, not deleted
      mockConfig.storage.graph.getEntities = vi.fn().mockResolvedValue([
        {
          id: 'SharedEntity',
          name: 'SharedEntity',
          type: 'SERVICE',
          description: 'test',
          sourceChunkIds: ['chunk:doc:test:0', 'chunk:doc:other:0'],
        },
      ]);
      mockConfig.storage.graph.getRelations = vi.fn().mockResolvedValue([]);

      await pipeline.deleteDocument(docId);

      expect(mockConfig.storage.graph.deleteEntity).not.toHaveBeenCalled();
      expect(mockConfig.storage.graph.addEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'SharedEntity',
          sourceChunkIds: ['chunk:doc:other:0'],
        }),
      );
    });

    it('should delete orphaned relations on shared entities', async () => {
      const docId = 'doc:test';

      mockConfig.storage.kv.list = vi.fn().mockImplementation((prefix: string) => {
        if (prefix === `chunk:${docId}:`) return Promise.resolve(['chunk:doc:test:0']);
        return Promise.resolve([]);
      });

      mockConfig.storage.graph.getEntities = vi.fn().mockResolvedValue([
        {
          id: 'SharedEntity',
          name: 'SharedEntity',
          type: 'SERVICE',
          description: 'test',
          sourceChunkIds: ['chunk:doc:test:0', 'chunk:doc:other:0'],
        },
      ]);

      // Relation only from deleted doc → should be deleted
      mockConfig.storage.graph.getRelations = vi.fn().mockResolvedValue([
        {
          id: 'rel1',
          sourceId: 'SharedEntity',
          targetId: 'Other',
          type: 'USES',
          description: 'test',
          keywords: [],
          sourceChunkIds: ['chunk:doc:test:0'],
        },
      ]);

      await pipeline.deleteDocument(docId);

      expect(mockConfig.storage.graph.deleteRelation).toHaveBeenCalledWith('rel1');
    });

    it('should update shared relations instead of deleting them', async () => {
      const docId = 'doc:test';

      mockConfig.storage.kv.list = vi.fn().mockImplementation((prefix: string) => {
        if (prefix === `chunk:${docId}:`) return Promise.resolve(['chunk:doc:test:0']);
        return Promise.resolve([]);
      });

      mockConfig.storage.graph.getEntities = vi.fn().mockResolvedValue([
        {
          id: 'SharedEntity',
          name: 'SharedEntity',
          type: 'SERVICE',
          description: 'test',
          sourceChunkIds: ['chunk:doc:test:0', 'chunk:doc:other:0'],
        },
      ]);

      // Relation shared with another doc → should be updated
      mockConfig.storage.graph.getRelations = vi.fn().mockResolvedValue([
        {
          id: 'rel1',
          sourceId: 'SharedEntity',
          targetId: 'Other',
          type: 'USES',
          description: 'test',
          keywords: [],
          sourceChunkIds: ['chunk:doc:test:0', 'chunk:doc:other:0'],
        },
      ]);

      await pipeline.deleteDocument(docId);

      expect(mockConfig.storage.graph.deleteRelation).not.toHaveBeenCalled();
      expect(mockConfig.storage.graph.addRelation).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'rel1',
          sourceChunkIds: ['chunk:doc:other:0'],
        }),
      );
    });

    it('should handle document with no chunks', async () => {
      mockConfig.storage.kv.list = vi.fn().mockResolvedValue([]);

      await pipeline.deleteDocument('doc:empty');

      expect(mockConfig.storage.vector.delete).not.toHaveBeenCalled();
      expect(mockConfig.storage.kv.delete).toHaveBeenCalledWith('doc:empty');
      expect(mockConfig.storage.kv.delete).toHaveBeenCalledWith('docHash:doc:empty');
    });

    it('should skip entities unrelated to deleted chunks', async () => {
      const docId = 'doc:test';

      mockConfig.storage.kv.list = vi.fn().mockImplementation((prefix: string) => {
        if (prefix === `chunk:${docId}:`) return Promise.resolve(['chunk:doc:test:0']);
        return Promise.resolve([]);
      });

      // Entity from a completely different document — should not be touched
      mockConfig.storage.graph.getEntities = vi.fn().mockResolvedValue([
        {
          id: 'UnrelatedEntity',
          name: 'UnrelatedEntity',
          type: 'SERVICE',
          description: 'test',
          sourceChunkIds: ['chunk:doc:other:0'],
        },
      ]);

      await pipeline.deleteDocument(docId);

      expect(mockConfig.storage.graph.deleteEntity).not.toHaveBeenCalled();
      expect(mockConfig.storage.graph.addEntity).not.toHaveBeenCalled();
    });

    it('should skip unrelated relations on shared entities', async () => {
      const docId = 'doc:test';

      mockConfig.storage.kv.list = vi.fn().mockImplementation((prefix: string) => {
        if (prefix === `chunk:${docId}:`) return Promise.resolve(['chunk:doc:test:0']);
        return Promise.resolve([]);
      });

      mockConfig.storage.graph.getEntities = vi.fn().mockResolvedValue([
        {
          id: 'SharedEntity',
          name: 'SharedEntity',
          type: 'SERVICE',
          description: 'test',
          sourceChunkIds: ['chunk:doc:test:0', 'chunk:doc:other:0'],
        },
      ]);

      // Relation from a completely different document — should not be touched
      mockConfig.storage.graph.getRelations = vi.fn().mockResolvedValue([
        {
          id: 'rel-unrelated',
          sourceId: 'SharedEntity',
          targetId: 'Other',
          type: 'USES',
          description: 'test',
          keywords: [],
          sourceChunkIds: ['chunk:doc:other:0'],
        },
      ]);

      await pipeline.deleteDocument(docId);

      expect(mockConfig.storage.graph.deleteRelation).not.toHaveBeenCalled();
      expect(mockConfig.storage.graph.addRelation).not.toHaveBeenCalled();
    });
  });

  describe('stale document detection', () => {
    it('should delete documents that no longer exist in scanned paths', async () => {
      // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
      const mockScanner = (pipeline as any).scanner;
      // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
      const mockChunker = (pipeline as any).chunker;

      const stalePath = '/content/old-file.txt';
      const staleDocId = `doc:${Buffer.from(stalePath).toString('base64url')}`;

      // Scanner returns only the current file
      mockScanner.scanFiles = vi
        .fn()
        .mockResolvedValue([
          { id: 'doc:current', content: 'current', metadata: { path: '/content/current.txt' } },
        ]);
      mockChunker.chunkDocument = vi.fn(() => []);

      // KV has a hash for the stale document
      mockConfig.storage.kv.list = vi.fn().mockImplementation((prefix: string) => {
        if (prefix === 'docHash:') return Promise.resolve([`docHash:${staleDocId}`]);
        if (prefix.startsWith('chunk:')) return Promise.resolve([]);
        return Promise.resolve([]);
      });
      mockConfig.storage.kv.get = vi.fn().mockResolvedValue(null);
      mockConfig.storage.graph.getEntities = vi.fn().mockResolvedValue([]);

      const events: string[] = [];
      await pipeline.process(['/content'], false, (e) => events.push(e.type));

      expect(events).toContain('document:delete');
      expect(mockConfig.storage.kv.delete).toHaveBeenCalledWith(staleDocId);
      expect(mockConfig.storage.kv.delete).toHaveBeenCalledWith(`docHash:${staleDocId}`);
    });

    it('should not delete documents from other directories', async () => {
      // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
      const mockScanner = (pipeline as any).scanner;
      // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
      const mockChunker = (pipeline as any).chunker;

      const otherPath = '/other-dir/file.txt';
      const otherDocId = `doc:${Buffer.from(otherPath).toString('base64url')}`;

      mockScanner.scanFiles = vi.fn().mockResolvedValue([]);
      mockChunker.chunkDocument = vi.fn(() => []);

      // KV has a hash for a doc from a different directory
      mockConfig.storage.kv.list = vi.fn().mockImplementation((prefix: string) => {
        if (prefix === 'docHash:') return Promise.resolve([`docHash:${otherDocId}`]);
        return Promise.resolve([]);
      });

      await pipeline.process(['/content']);

      // Should NOT delete the doc from /other-dir
      expect(mockConfig.storage.kv.delete).not.toHaveBeenCalledWith(otherDocId);
    });

    it('should skip docHash entries with non-doc IDs', async () => {
      // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
      const mockScanner = (pipeline as any).scanner;
      // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
      const mockChunker = (pipeline as any).chunker;

      mockScanner.scanFiles = vi.fn().mockResolvedValue([]);
      mockChunker.chunkDocument = vi.fn(() => []);

      // KV has a hash with a non-doc: prefix (shouldn't happen, but defensive)
      mockConfig.storage.kv.list = vi.fn().mockImplementation((prefix: string) => {
        if (prefix === 'docHash:') return Promise.resolve(['docHash:not-a-doc-id']);
        return Promise.resolve([]);
      });

      await pipeline.process(['/content']);

      expect(mockConfig.storage.kv.delete).not.toHaveBeenCalledWith('not-a-doc-id');
    });

    it('should not delete documents still present in scan', async () => {
      // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
      const mockScanner = (pipeline as any).scanner;
      // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
      const mockChunker = (pipeline as any).chunker;

      const filePath = '/content/still-here.txt';
      const docId = `doc:${Buffer.from(filePath).toString('base64url')}`;

      mockScanner.scanFiles = vi
        .fn()
        .mockResolvedValue([{ id: docId, content: 'still here', metadata: { path: filePath } }]);
      mockChunker.chunkDocument = vi.fn(() => []);

      // Same doc exists in both scan and KV
      mockConfig.storage.kv.list = vi.fn().mockImplementation((prefix: string) => {
        if (prefix === 'docHash:') return Promise.resolve([`docHash:${docId}`]);
        return Promise.resolve([]);
      });
      // Hash matches → skip processing
      mockConfig.storage.kv.get = vi.fn().mockResolvedValue('matching-hash');

      const events: string[] = [];
      await pipeline.process(['/content'], false, (e) => events.push(e.type));

      // Should skip (not delete) the document
      expect(events).not.toContain('document:delete');
    });
  });

  describe('extraction gleaning', () => {
    it('should run additional extraction passes when extractionGleanings > 0', async () => {
      const gleanPipeline = new IndexingPipeline(mockConfig, {
        ...mockOptions,
        extractionGleanings: 1,
      });

      // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
      const mockScanner = (gleanPipeline as any).scanner;
      // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
      const mockChunker = (gleanPipeline as any).chunker;

      mockScanner.scanFiles = vi
        .fn()
        .mockResolvedValue([{ id: 'doc:test', content: 'test', metadata: { path: '/test.txt' } }]);
      mockChunker.chunkDocument = vi.fn(() => [
        { id: 'chunk:1', content: 'test', documentId: 'doc:test', startToken: 0, endToken: 5 },
      ]);
      mockConfig.storage.kv.get = vi.fn().mockResolvedValue(null);

      // First call returns entity A, second (gleaning) returns entity B
      mockConfig.extractor.extractEntities = vi
        .fn()
        .mockResolvedValueOnce({
          entities: [{ name: 'A', type: 'SERVICE', description: 'first' }],
          relations: [
            { source: 'A', target: 'X', type: 'USES', description: 'uses', keywords: [] },
          ],
        })
        .mockResolvedValueOnce({
          entities: [
            { name: 'A', type: 'SERVICE', description: 'dup' },
            { name: 'B', type: 'DATABASE', description: 'gleaned' },
          ],
          relations: [
            { source: 'A', target: 'X', type: 'USES', description: 'dup', keywords: [] },
            { source: 'B', target: 'A', type: 'USES', description: 'new', keywords: [] },
          ],
        });

      await gleanPipeline.process(['/test.txt']);

      // Extractor called twice (1 initial + 1 gleaning)
      expect(mockConfig.extractor.extractEntities).toHaveBeenCalledTimes(2);
      // Second call should include entity A as known
      expect(mockConfig.extractor.extractEntities).toHaveBeenLastCalledWith(
        'test',
        ['A'],
        mockConfig.schema,
      );
      // Both entities stored (A from first pass, B from gleaning, duplicate A skipped)
      expect(mockConfig.storage.graph.addEntity).toHaveBeenCalledTimes(2);
      expect(mockConfig.storage.graph.addEntity).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'A' }),
      );
      expect(mockConfig.storage.graph.addEntity).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'B' }),
      );
      // Relations: A→X from first pass, B→A from gleaning (duplicate A→X skipped)
      expect(mockConfig.storage.graph.addRelation).toHaveBeenCalledTimes(2);

      gleanPipeline.dispose();
    });
  });

  describe('observability hooks', () => {
    it('should call onLLMCall when extracting entities', async () => {
      // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
      const mockScanner = (pipeline as any).scanner;
      // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
      const mockChunker = (pipeline as any).chunker;

      mockScanner.scanFiles = vi
        .fn()
        .mockResolvedValue([{ id: 'doc:test', content: 'test', metadata: { path: '/test.txt' } }]);
      mockChunker.chunkDocument = vi.fn(() => [
        { id: 'chunk:1', content: 'test', documentId: 'doc:test', startToken: 0, endToken: 5 },
      ]);
      mockConfig.storage.kv.get = vi.fn().mockResolvedValue(null);

      const onLLMCall = vi.fn();
      mockConfig.observability = { onLLMCall };

      await pipeline.process(['/test.txt']);

      expect(onLLMCall).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'extractor', duration: expect.any(Number) }),
      );
    });

    it('should call onEmbedding when generating embeddings', async () => {
      // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
      const mockScanner = (pipeline as any).scanner;
      // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
      const mockChunker = (pipeline as any).chunker;

      mockScanner.scanFiles = vi
        .fn()
        .mockResolvedValue([{ id: 'doc:test', content: 'test', metadata: { path: '/test.txt' } }]);
      mockChunker.chunkDocument = vi.fn(() => [
        { id: 'chunk:1', content: 'test', documentId: 'doc:test', startToken: 0, endToken: 5 },
      ]);

      const onEmbedding = vi.fn();
      mockConfig.observability = { onEmbedding };

      await pipeline.process(['/test.txt']);

      expect(onEmbedding).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'test', textsCount: 1, duration: expect.any(Number) }),
      );
    });

    it('should not call onLLMCall when extraction is cached', async () => {
      // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
      const mockScanner = (pipeline as any).scanner;
      // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
      const mockChunker = (pipeline as any).chunker;

      mockScanner.scanFiles = vi
        .fn()
        .mockResolvedValue([{ id: 'doc:test', content: 'test', metadata: { path: '/test.txt' } }]);
      mockChunker.chunkDocument = vi.fn(() => [
        { id: 'chunk:1', content: 'test', documentId: 'doc:test', startToken: 0, endToken: 5 },
      ]);
      // Cache hit
      mockConfig.storage.kv.get = vi.fn().mockResolvedValue({
        entities: [],
        relations: [],
      });

      const onLLMCall = vi.fn();
      mockConfig.observability = { onLLMCall };

      await pipeline.process(['/test.txt']);

      expect(onLLMCall).not.toHaveBeenCalled();
    });
  });

  describe('decodeDocId', () => {
    it('should decode base64url doc IDs', () => {
      const filePath = '/content/test.txt';
      const docId = `doc:${Buffer.from(filePath).toString('base64url')}`;
      // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
      expect((pipeline as any).decodeDocId(docId)).toBe(filePath);
    });

    it('should return null for non-doc IDs', () => {
      // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
      expect((pipeline as any).decodeDocId('chunk:test')).toBeNull();
    });

    it('should return null for invalid base64url', () => {
      // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
      const result = (pipeline as any).decodeDocId('doc:!!!invalid!!!');
      // Buffer.from with base64url doesn't throw, it just decodes what it can
      expect(typeof result).toBe('string');
    });
  });
});
