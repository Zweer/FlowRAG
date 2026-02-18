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

vi.mock('@flowrag/provider-local', () => ({ LocalEmbedder: MockLocalEmbedder }));
vi.mock('@flowrag/provider-gemini', () => ({
  GeminiEmbedder: MockGeminiEmbedder,
  GeminiExtractor: MockGeminiExtractor,
}));
vi.mock('@flowrag/provider-bedrock', () => ({
  BedrockEmbedder: MockBedrockEmbedder,
  BedrockExtractor: MockBedrockExtractor,
}));

vi.mock('@flowrag/presets', () => ({
  createLocalStorage: vi.fn().mockReturnValue({
    storage: {
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
    },
  }),
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
  it('creates instance with local embedder', () => {
    const { rag, graph } = createRagFromConfig(baseConfig);
    expect(rag).toBeDefined();
    expect(graph).toBeDefined();
  });

  it('creates instance with gemini embedder', () => {
    const { rag } = createRagFromConfig({ ...baseConfig, embedder: { provider: 'gemini' } });
    expect(rag).toBeDefined();
  });

  it('creates instance with bedrock embedder', () => {
    const { rag } = createRagFromConfig({ ...baseConfig, embedder: { provider: 'bedrock' } });
    expect(rag).toBeDefined();
  });

  it('creates instance with bedrock extractor', () => {
    const { rag } = createRagFromConfig({ ...baseConfig, extractor: { provider: 'bedrock' } });
    expect(rag).toBeDefined();
  });

  it('throws on unknown embedder provider', () => {
    expect(() => createRagFromConfig({ ...baseConfig, embedder: { provider: 'unknown' } })).toThrow(
      'Unknown embedder provider',
    );
  });

  it('throws on unknown extractor provider', () => {
    expect(() =>
      createRagFromConfig({ ...baseConfig, extractor: { provider: 'unknown' } }),
    ).toThrow('Unknown extractor provider');
  });
});
