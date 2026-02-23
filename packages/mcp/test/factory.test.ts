import { describe, expect, it, vi } from 'vitest';

import type { FlowRAGMcpConfig } from '../src/config.js';

class MockLocalEmbedder {
  dimensions = 384;
  modelName = 'mock-local';
  embed = vi.fn();
  embedBatch = vi.fn();
}

class MockGeminiEmbedder {
  dimensions = 3072;
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

const mockStorage = {
  kv: { get: vi.fn(), set: vi.fn(), delete: vi.fn(), list: vi.fn(), clear: vi.fn() },
  vector: { upsert: vi.fn(), search: vi.fn(), delete: vi.fn(), count: vi.fn() },
  graph: {
    addEntity: vi.fn(),
    addRelation: vi.fn(),
    getEntity: vi.fn(),
    getEntities: vi.fn(),
    getRelations: vi.fn(),
    traverse: vi.fn(),
    findPath: vi.fn(),
    deleteEntity: vi.fn(),
    deleteRelation: vi.fn(),
  },
};

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
  createLocalStorage: vi.fn().mockReturnValue({ storage: mockStorage }),
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

// Mock remote storage packages
const mockRedisClient = { connect: vi.fn() };
vi.mock('redis', () => ({
  createClient: vi.fn().mockReturnValue(mockRedisClient),
}));

class MockRedisKVStorage {}
class MockRedisVectorStorage {}
vi.mock('@flowrag/storage-redis', () => ({
  RedisKVStorage: MockRedisKVStorage,
  RedisVectorStorage: MockRedisVectorStorage,
}));

class MockS3KVStorage {}
vi.mock('@flowrag/storage-s3', () => ({
  S3KVStorage: MockS3KVStorage,
}));

class MockOpenSearchVectorStorage {}
class MockOpenSearchGraphStorage {}
vi.mock('@flowrag/storage-opensearch', () => ({
  OpenSearchVectorStorage: MockOpenSearchVectorStorage,
  OpenSearchGraphStorage: MockOpenSearchGraphStorage,
}));

class MockOSClient {}
vi.mock('@opensearch-project/opensearch', () => ({
  Client: MockOSClient,
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
  it('creates instance with local storage', async () => {
    const { rag, graph } = await createRagFromConfig(baseConfig);
    expect(rag).toBeDefined();
    expect(graph).toBeDefined();
  });

  it('wraps storage with namespace when configured', async () => {
    const { rag } = await createRagFromConfig({ ...baseConfig, namespace: 'tenant-a' });
    expect(rag).toBeDefined();
  });

  describe('embedder', () => {
    it('creates gemini embedder', async () => {
      const { rag } = await createRagFromConfig({
        ...baseConfig,
        embedder: { provider: 'gemini' },
      });
      expect(rag).toBeDefined();
    });

    it('creates bedrock embedder', async () => {
      const { rag } = await createRagFromConfig({
        ...baseConfig,
        embedder: { provider: 'bedrock' },
      });
      expect(rag).toBeDefined();
    });

    it('creates openai embedder', async () => {
      const { rag } = await createRagFromConfig({
        ...baseConfig,
        embedder: { provider: 'openai' },
      });
      expect(rag).toBeDefined();
    });

    it('throws on unknown embedder provider', async () => {
      await expect(
        createRagFromConfig({ ...baseConfig, embedder: { provider: 'unknown' } }),
      ).rejects.toThrow('Unknown embedder provider');
    });
  });

  describe('extractor', () => {
    it('creates bedrock extractor', async () => {
      const { rag } = await createRagFromConfig({
        ...baseConfig,
        extractor: { provider: 'bedrock' },
      });
      expect(rag).toBeDefined();
    });

    it('creates openai extractor', async () => {
      const { rag } = await createRagFromConfig({
        ...baseConfig,
        extractor: { provider: 'openai' },
      });
      expect(rag).toBeDefined();
    });

    it('creates anthropic extractor', async () => {
      const { rag } = await createRagFromConfig({
        ...baseConfig,
        extractor: { provider: 'anthropic' },
      });
      expect(rag).toBeDefined();
    });

    it('throws on unknown extractor provider', async () => {
      await expect(
        createRagFromConfig({ ...baseConfig, extractor: { provider: 'unknown' } }),
      ).rejects.toThrow('Unknown extractor provider');
    });
  });

  describe('remote storage', () => {
    it('creates Redis KV storage', async () => {
      const { rag } = await createRagFromConfig({
        ...baseConfig,
        storage: { kv: { provider: 'redis', url: 'redis://localhost:6379' } },
      });
      expect(rag).toBeDefined();
      expect(mockRedisClient.connect).toHaveBeenCalled();
    });

    it('creates S3 KV storage', async () => {
      const { rag } = await createRagFromConfig({
        ...baseConfig,
        storage: { kv: { provider: 's3', bucket: 'my-bucket', prefix: 'kv/' } },
      });
      expect(rag).toBeDefined();
    });

    it('throws when S3 bucket is missing', async () => {
      await expect(
        createRagFromConfig({
          ...baseConfig,
          storage: { kv: { provider: 's3' } },
        }),
      ).rejects.toThrow('S3 KV storage requires "bucket"');
    });

    it('throws on unknown KV provider', async () => {
      await expect(
        createRagFromConfig({
          ...baseConfig,
          storage: { kv: { provider: 'json' as never } },
        }),
      ).rejects.toThrow('Unknown KV storage provider');
    });

    it('creates OpenSearch vector storage', async () => {
      const { rag } = await createRagFromConfig({
        ...baseConfig,
        storage: { vector: { provider: 'opensearch', node: 'https://os:9200', dimensions: 1024 } },
      });
      expect(rag).toBeDefined();
    });

    it('throws when OpenSearch dimensions is missing', async () => {
      await expect(
        createRagFromConfig({
          ...baseConfig,
          storage: { vector: { provider: 'opensearch', node: 'https://os:9200' } },
        }),
      ).rejects.toThrow('OpenSearch vector storage requires "dimensions"');
    });

    it('creates Redis vector storage', async () => {
      const { rag } = await createRagFromConfig({
        ...baseConfig,
        storage: { vector: { provider: 'redis', url: 'redis://localhost:6379', dimensions: 384 } },
      });
      expect(rag).toBeDefined();
    });

    it('throws when Redis vector dimensions is missing', async () => {
      await expect(
        createRagFromConfig({
          ...baseConfig,
          storage: { vector: { provider: 'redis', url: 'redis://localhost:6379' } },
        }),
      ).rejects.toThrow('Redis vector storage requires "dimensions"');
    });

    it('throws on unknown vector provider', async () => {
      await expect(
        createRagFromConfig({
          ...baseConfig,
          storage: { vector: { provider: 'lancedb' as never } },
        }),
      ).rejects.toThrow('Unknown vector storage provider');
    });

    it('creates OpenSearch graph storage', async () => {
      const { rag } = await createRagFromConfig({
        ...baseConfig,
        storage: { graph: { provider: 'opensearch', node: 'https://os:9200' } },
      });
      expect(rag).toBeDefined();
    });

    it('throws on unknown graph provider', async () => {
      await expect(
        createRagFromConfig({
          ...baseConfig,
          storage: { graph: { provider: 'sqlite' as never } },
        }),
      ).rejects.toThrow('Unknown graph storage provider');
    });

    it('creates full remote storage config', async () => {
      const { rag, graph } = await createRagFromConfig({
        ...baseConfig,
        storage: {
          kv: { provider: 'redis', url: 'redis://localhost:6379' },
          vector: { provider: 'opensearch', node: 'https://os:9200', dimensions: 1024 },
          graph: { provider: 'opensearch', node: 'https://os:9200' },
        },
      });
      expect(rag).toBeDefined();
      expect(graph).toBeDefined();
    });

    it('falls back to local for omitted storage types', async () => {
      const { rag } = await createRagFromConfig({
        ...baseConfig,
        storage: { kv: { provider: 'redis', url: 'redis://localhost:6379' } },
      });
      expect(rag).toBeDefined();
    });
  });
});
