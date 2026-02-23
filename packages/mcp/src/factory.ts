import type { Embedder, GraphStorage, KVStorage, LLMExtractor, VectorStorage } from '@flowrag/core';
import { defineSchema, withNamespace } from '@flowrag/core';
import { createFlowRAG, type FlowRAG } from '@flowrag/pipeline';
import { createLocalStorage } from '@flowrag/presets';
import { AnthropicExtractor } from '@flowrag/provider-anthropic';
import { BedrockEmbedder, BedrockExtractor } from '@flowrag/provider-bedrock';
import { GeminiEmbedder, GeminiExtractor } from '@flowrag/provider-gemini';
import { LocalEmbedder } from '@flowrag/provider-local';
import { OpenAIEmbedder, OpenAIExtractor } from '@flowrag/provider-openai';

import type {
  FlowRAGMcpConfig,
  GraphStorageConfig,
  KVStorageConfig,
  VectorStorageConfig,
} from './config.js';

export interface FlowRAGInstance {
  rag: FlowRAG;
  graph: GraphStorage;
}

export async function createRagFromConfig(config: FlowRAGMcpConfig): Promise<FlowRAGInstance> {
  const schema = defineSchema({
    entityTypes: config.schema.entityTypes,
    relationTypes: config.schema.relationTypes,
    documentFields: config.schema.documentFields,
    entityFields: config.schema.entityFields,
    relationFields: config.schema.relationFields,
  });

  let storage: { kv: KVStorage; vector: VectorStorage; graph: GraphStorage };

  if (config.storage) {
    storage = {
      kv: config.storage.kv
        ? await createKVStorage(config.storage.kv)
        : createLocalStorage(config.data).storage.kv,
      vector: config.storage.vector
        ? await createVectorStorage(config.storage.vector)
        : createLocalStorage(config.data).storage.vector,
      graph: config.storage.graph
        ? await createGraphStorage(config.storage.graph)
        : createLocalStorage(config.data).storage.graph,
    };
  } else {
    storage = createLocalStorage(config.data).storage;
  }

  const graph = storage.graph;
  const namespacedStorage = config.namespace ? withNamespace(storage, config.namespace) : storage;

  const rag = createFlowRAG({
    schema,
    storage: namespacedStorage,
    embedder: createEmbedder(config),
    extractor: createExtractor(config),
  });

  return { rag, graph };
}

async function createKVStorage(cfg: KVStorageConfig): Promise<KVStorage> {
  switch (cfg.provider) {
    case 'redis': {
      const { createClient } = await import('redis');
      const { RedisKVStorage } = await import('@flowrag/storage-redis');
      const client = createClient({ url: cfg.url });
      await client.connect();
      return new RedisKVStorage({ client });
    }
    case 's3': {
      if (!cfg.bucket) throw new Error('S3 KV storage requires "bucket" in config');
      const { S3KVStorage } = await import('@flowrag/storage-s3');
      return new S3KVStorage({ bucket: cfg.bucket, prefix: cfg.prefix, region: cfg.region });
    }
    default:
      throw new Error(`Unknown KV storage provider: ${cfg.provider}`);
  }
}

async function createVectorStorage(cfg: VectorStorageConfig): Promise<VectorStorage> {
  switch (cfg.provider) {
    case 'opensearch': {
      if (!cfg.dimensions)
        throw new Error('OpenSearch vector storage requires "dimensions" in config');
      const { Client } = await import('@opensearch-project/opensearch');
      const { OpenSearchVectorStorage } = await import('@flowrag/storage-opensearch');
      const client = new Client({ node: cfg.node });
      return new OpenSearchVectorStorage({ client, dimensions: cfg.dimensions });
    }
    case 'redis': {
      if (!cfg.dimensions) throw new Error('Redis vector storage requires "dimensions" in config');
      const { createClient } = await import('redis');
      const { RedisVectorStorage } = await import('@flowrag/storage-redis');
      const client = createClient({ url: cfg.url });
      await client.connect();
      return new RedisVectorStorage({ client, dimensions: cfg.dimensions });
    }
    default:
      throw new Error(`Unknown vector storage provider: ${cfg.provider}`);
  }
}

async function createGraphStorage(cfg: GraphStorageConfig): Promise<GraphStorage> {
  switch (cfg.provider) {
    case 'opensearch': {
      const { Client } = await import('@opensearch-project/opensearch');
      const { OpenSearchGraphStorage } = await import('@flowrag/storage-opensearch');
      const client = new Client({ node: cfg.node });
      return new OpenSearchGraphStorage({ client });
    }
    default:
      throw new Error(`Unknown graph storage provider: ${cfg.provider}`);
  }
}

function createEmbedder(config: FlowRAGMcpConfig): Embedder {
  switch (config.embedder.provider) {
    case 'local':
      return new LocalEmbedder({ model: config.embedder.model });
    case 'gemini':
      return new GeminiEmbedder({ model: config.embedder.model });
    case 'bedrock':
      return new BedrockEmbedder({ model: config.embedder.model });
    case 'openai':
      return new OpenAIEmbedder({ model: config.embedder.model });
    default:
      throw new Error(`Unknown embedder provider: ${config.embedder.provider}`);
  }
}

function createExtractor(config: FlowRAGMcpConfig): LLMExtractor {
  switch (config.extractor.provider) {
    case 'gemini':
      return new GeminiExtractor({ model: config.extractor.model });
    case 'bedrock':
      return new BedrockExtractor({ model: config.extractor.model });
    case 'openai':
      return new OpenAIExtractor({ model: config.extractor.model });
    case 'anthropic':
      return new AnthropicExtractor({ model: config.extractor.model });
    default:
      throw new Error(`Unknown extractor provider: ${config.extractor.provider}`);
  }
}
