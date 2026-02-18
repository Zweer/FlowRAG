import type { Embedder, GraphStorage, LLMExtractor } from '@flowrag/core';
import { defineSchema } from '@flowrag/core';
import { createFlowRAG, type FlowRAG } from '@flowrag/pipeline';
import { createLocalStorage } from '@flowrag/presets';
import { BedrockEmbedder, BedrockExtractor } from '@flowrag/provider-bedrock';
import { GeminiEmbedder, GeminiExtractor } from '@flowrag/provider-gemini';
import { LocalEmbedder } from '@flowrag/provider-local';

import type { FlowRAGMcpConfig } from './config.js';

export interface FlowRAGInstance {
  rag: FlowRAG;
  graph: GraphStorage;
}

export function createRagFromConfig(config: FlowRAGMcpConfig): FlowRAGInstance {
  const schema = defineSchema({
    entityTypes: config.schema.entityTypes,
    relationTypes: config.schema.relationTypes,
    documentFields: config.schema.documentFields,
    entityFields: config.schema.entityFields,
    relationFields: config.schema.relationFields,
  });

  const local = createLocalStorage(config.data);

  const rag = createFlowRAG({
    schema,
    storage: local.storage,
    embedder: createEmbedder(config),
    extractor: createExtractor(config),
  });

  return { rag, graph: local.storage.graph };
}

function createEmbedder(config: FlowRAGMcpConfig): Embedder {
  switch (config.embedder.provider) {
    case 'local':
      return new LocalEmbedder({ model: config.embedder.model });
    case 'gemini':
      return new GeminiEmbedder({ model: config.embedder.model });
    case 'bedrock':
      return new BedrockEmbedder({ model: config.embedder.model });
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
    default:
      throw new Error(`Unknown extractor provider: ${config.extractor.provider}`);
  }
}
