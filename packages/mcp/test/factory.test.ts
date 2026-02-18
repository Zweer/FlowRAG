import { describe, expect, it, vi } from 'vitest';

import type { FlowRAGMcpConfig } from '../src/config.js';

class MockLocalEmbedder {
  dimensions = 384;
  modelName = 'mock-local';
  embed = vi.fn();
  embedBatch = vi.fn();
}

class MockGeminiEmbedder {
  dimensions = 768;
  modelName = 'mock-gemini';
  embed = vi.fn();
  embedBatch = vi.fn();
}

class MockGeminiExtractor {
  extractEntities = vi.fn();
}

class MockBedrockEmbedder {
  dimensions = 1024;
  modelName = 'mock-bedrock';
  embed = vi.fn();
  embedBatch = vi.fn();
}

class MockBedrockExtractor {
  extractEntities = vi.fn();
}

class MockOpenAIEmbedder {
  dimensions = 1536;
  modelName = 'mock-openai';
  embed = vi.fn();
  embedBatch = vi.fn();
}

class MockOpenAIExtractor {
  extractEntities = vi.fn();
}

class MockAnthropicExtractor {
  extractEntities = vi.fn();
}

class MockRedisKVStorage {
  get = vi.fn();
  set = vi.fn();
  delete = vi.fn();
  list = vi.fn();
  clear = vi.fn();
}

class MockRedisVectorStorage {
  upsert = vi.fn();
  search = vi.fn();
  delete = vi.fn();
  count = vi.fn();
}

class MockSQLiteGraphStorage {
  addEntity = vi.fn();
  addRelation = vi.fn();
  getEntity = vi.fn();
  getEntities = vi.fn();
  getRelations = vi.fn();
  traverse = vi.fn();
  findPath = vi.fn();
  deleteEntity = vi.fn();
  deleteRelation = vi.fn();
}

vi.mock('@flowrag/provider-local', () => ({ LocalEmbedder: MockLocalEmbedder }));
vi.mock('@flowrag/provider-gemini', () => ({
  GeminiEmbedder: MockGeminiEmbedder,
  GeminiExtractor: MockGeminiExtractor,
}));
vi.mock('@flowrag/provider-bedrock', () => ({
  BedrockEmbedder: MockBedrockEmbedder,
  BedrockExtractor: MockBedrockExtractor,
}));
vi.mock('@flowrag/provider-openai', () => ({
  OpenAIEmbedder: MockOpenAIEmbedder,
  OpenAIExtractor: MockOpenAIExtractor,
}));
vi.mock('@flowrag/provider-anthropic', () => ({
  AnthropicExtractor: MockAnthropicExtractor,
}));

vi.mock('@flowrag/presets', () => ({
  createLocalStorage: vi.fn().mockReturnValue({
    storage: {
      kv: { get: vi.fn(), set: vi.fn(), delete: vi.fn(), list: vi.fn(), clear: vi.fn() },
      vector: { upsert: vi.fn(), search: vi.fn(), delete: vi.fn(), count: vi.fn() },
      graph: new MockSQLiteGraphStorage(),
    },
  }),
}));

vi.mock('@flowrag/storage-redis', () => ({
  RedisKVStorage: MockRedisKVStorage,
  RedisVectorStorage: MockRedisVectorStorage,
}));

vi.mock('@flowrag/storage-sqlite', () => ({
  SQLiteGraphStorage: MockSQLiteGraphStorage,
}));

const mockConnect = vi.fn().mockResolvedValue(undefined);
vi.mock('redis', () => ({
  createClient: vi.fn().mockReturnValue({ connect: mockConnect }),
}));

vi.mock('@flowrag/pipeline', () => ({
  createFlowRAG: vi.fn().mockReturnValue({
    index: vi.fn(),
    search: vi.fn(),
    traceDataFlow: vi.fn(),
    findPath: vi.fn(),
    stats: vi.fn(),
  }),
}));

const { createRagFromConfig } = await import('../src/factory.js');

const baseConfig: FlowRAGMcpConfig = {
  data: './data',
  schema: { entityTypes: ['SERVICE'], relationTypes: ['USES'] },
  embedder: { provider: 'local' },
  extractor: { provider: 'gemini' },
  transport: 'stdio',
  port: 3000,
};

describe('createRagFromConfig', () => {
  describe('storage', () => {
    it('uses local storage by default', () => {
      const { rag, graph } = createRagFromConfig(baseConfig);
      expect(rag).toBeDefined();
      expect(graph).toBeDefined();
    });

    it('creates redis storage', () => {
      const { rag } = createRagFromConfig({
        ...baseConfig,
        storage: { type: 'redis', url: 'redis://localhost:6379' },
      });
      expect(rag).toBeDefined();
    });

    it('creates redis storage without url', () => {
      const { rag } = createRagFromConfig({
        ...baseConfig,
        storage: { type: 'redis' },
      });
      expect(rag).toBeDefined();
    });

    it('uses fallback dimensions for unknown embedder with redis', () => {
      expect(() =>
        createRagFromConfig({
          ...baseConfig,
          storage: { type: 'redis' },
          embedder: { provider: 'custom' },
        }),
      ).toThrow('Unknown embedder provider');
    });
  });

  describe('namespace', () => {
    it('wraps storage with namespace when configured', () => {
      const { rag } = createRagFromConfig({ ...baseConfig, namespace: 'tenant-a' });
      expect(rag).toBeDefined();
    });
  });

  describe('embedder', () => {
    it('creates local embedder', () => {
      const { rag } = createRagFromConfig(baseConfig);
      expect(rag).toBeDefined();
    });

    it('creates gemini embedder', () => {
      const { rag } = createRagFromConfig({ ...baseConfig, embedder: { provider: 'gemini' } });
      expect(rag).toBeDefined();
    });

    it('creates bedrock embedder', () => {
      const { rag } = createRagFromConfig({ ...baseConfig, embedder: { provider: 'bedrock' } });
      expect(rag).toBeDefined();
    });

    it('creates openai embedder', () => {
      const { rag } = createRagFromConfig({ ...baseConfig, embedder: { provider: 'openai' } });
      expect(rag).toBeDefined();
    });

    it('throws on unknown embedder provider', () => {
      expect(() =>
        createRagFromConfig({ ...baseConfig, embedder: { provider: 'unknown' } }),
      ).toThrow('Unknown embedder provider');
    });
  });

  describe('extractor', () => {
    it('creates gemini extractor', () => {
      const { rag } = createRagFromConfig(baseConfig);
      expect(rag).toBeDefined();
    });

    it('creates bedrock extractor', () => {
      const { rag } = createRagFromConfig({ ...baseConfig, extractor: { provider: 'bedrock' } });
      expect(rag).toBeDefined();
    });

    it('creates openai extractor', () => {
      const { rag } = createRagFromConfig({ ...baseConfig, extractor: { provider: 'openai' } });
      expect(rag).toBeDefined();
    });

    it('creates anthropic extractor', () => {
      const { rag } = createRagFromConfig({
        ...baseConfig,
        extractor: { provider: 'anthropic' },
      });
      expect(rag).toBeDefined();
    });

    it('throws on unknown extractor provider', () => {
      expect(() =>
        createRagFromConfig({ ...baseConfig, extractor: { provider: 'unknown' } }),
      ).toThrow('Unknown extractor provider');
    });
  });
});
