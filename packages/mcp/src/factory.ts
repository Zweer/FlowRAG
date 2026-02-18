import type { Embedder, GraphStorage, KVStorage, LLMExtractor, VectorStorage } from '@flowrag/core';
import { defineSchema, withNamespace } from '@flowrag/core';
import { createFlowRAG, type FlowRAG } from '@flowrag/pipeline';
import { createLocalStorage } from '@flowrag/presets';
import { AnthropicExtractor } from '@flowrag/provider-anthropic';
import { BedrockEmbedder, BedrockExtractor } from '@flowrag/provider-bedrock';
import { GeminiEmbedder, GeminiExtractor } from '@flowrag/provider-gemini';
import { LocalEmbedder } from '@flowrag/provider-local';
import { OpenAIEmbedder, OpenAIExtractor } from '@flowrag/provider-openai';
import { RedisKVStorage, RedisVectorStorage } from '@flowrag/storage-redis';
import { SQLiteGraphStorage } from '@flowrag/storage-sqlite';
import { createClient } from 'redis';

import type { FlowRAGMcpConfig } from './config.js';

export interface FlowRAGInstance {
  rag: FlowRAG;
  graph: GraphStorage;
}

const DIMENSIONS: Record<string, number> = {
  local: 384,
  gemini: 768,
  bedrock: 1024,
  openai: 1536,
};

export function createRagFromConfig(config: FlowRAGMcpConfig): FlowRAGInstance {
  const schema = defineSchema({
    entityTypes: config.schema.entityTypes,
    relationTypes: config.schema.relationTypes,
    documentFields: config.schema.documentFields,
    entityFields: config.schema.entityFields,
    relationFields: config.schema.relationFields,
  });

  const { storage, graph } = createStorage(config);
  const finalStorage = config.namespace ? withNamespace(storage, config.namespace) : storage;

  const rag = createFlowRAG({
    schema,
    storage: finalStorage,
    embedder: createEmbedder(config),
    extractor: createExtractor(config),
  });

  return { rag, graph };
}

function createStorage(config: FlowRAGMcpConfig): {
  storage: { kv: KVStorage; vector: VectorStorage; graph: GraphStorage };
  graph: GraphStorage;
} {
  const type = config.storage?.type ?? 'local';

  if (type === 'redis') {
    const client = createClient({ url: config.storage?.url });
    client.connect();
    const dimensions = DIMENSIONS[config.embedder.provider] ?? 384;
    const graph = new SQLiteGraphStorage({ path: `${config.data}/graph.db` });
    return {
      storage: {
        kv: new RedisKVStorage({ client }),
        vector: new RedisVectorStorage({ client, dimensions }),
        graph,
      },
      graph,
    };
  }

  const local = createLocalStorage(config.data);
  return { storage: local.storage, graph: local.storage.graph };
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
