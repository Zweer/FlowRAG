import { BedrockEmbedder, BedrockExtractor } from '@flowrag/provider-bedrock';
import { OpenSearchGraphStorage, OpenSearchVectorStorage } from '@flowrag/storage-opensearch';
import { S3KVStorage } from '@flowrag/storage-s3';
import { describe, expect, it, vi } from 'vitest';

import { createAWSStorage } from '../src/index.js';

function mockOSClient() {
  return {
    indices: { exists: vi.fn().mockResolvedValue({ body: true }), create: vi.fn() },
    bulk: vi.fn(),
    search: vi.fn(),
    count: vi.fn(),
    index: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  };
}

describe('createAWSStorage', () => {
  // biome-ignore lint/suspicious/noExplicitAny: test mock
  const client = mockOSClient() as any;

  it('creates default AWS storage configuration', () => {
    const config = createAWSStorage({ bucket: 'my-bucket', opensearchClient: client });

    expect(config.storage.kv).toBeInstanceOf(S3KVStorage);
    expect(config.storage.vector).toBeInstanceOf(OpenSearchVectorStorage);
    expect(config.storage.graph).toBeInstanceOf(OpenSearchGraphStorage);
    expect(config.embedder).toBeInstanceOf(BedrockEmbedder);
    expect(config.extractor).toBeInstanceOf(BedrockExtractor);
  });

  it('uses custom prefix and region', () => {
    const config = createAWSStorage({
      bucket: 'my-bucket',
      prefix: 'custom/',
      region: 'us-west-2',
      opensearchClient: client,
    });

    expect(config.storage.kv).toBeInstanceOf(S3KVStorage);
    expect(config.embedder).toBeInstanceOf(BedrockEmbedder);
  });

  it('uses custom dimensions', () => {
    const config = createAWSStorage({
      bucket: 'b',
      opensearchClient: client,
      dimensions: 384,
    });

    expect(config.storage.vector).toBeInstanceOf(OpenSearchVectorStorage);
  });

  it('allows overriding individual components', () => {
    const customKV = new S3KVStorage({ bucket: 'override' });
    const config = createAWSStorage({
      bucket: 'b',
      opensearchClient: client,
      kv: customKV,
    });

    expect(config.storage.kv).toBe(customKV);
    expect(config.storage.vector).toBeInstanceOf(OpenSearchVectorStorage);
  });

  it('allows overriding embedder and extractor', () => {
    const customEmbedder = new BedrockEmbedder({ model: 'custom' });
    const customExtractor = new BedrockExtractor({ model: 'custom' });
    const config = createAWSStorage({
      bucket: 'b',
      opensearchClient: client,
      embedder: customEmbedder,
      extractor: customExtractor,
    });

    expect(config.embedder).toBe(customEmbedder);
    expect(config.extractor).toBe(customExtractor);
  });

  it('allows overriding vector and graph', () => {
    const customVector = new OpenSearchVectorStorage({ client, dimensions: 512 });
    const customGraph = new OpenSearchGraphStorage({ client });
    const config = createAWSStorage({
      bucket: 'b',
      opensearchClient: client,
      vector: customVector,
      graph: customGraph,
    });

    expect(config.storage.vector).toBe(customVector);
    expect(config.storage.graph).toBe(customGraph);
  });
});
