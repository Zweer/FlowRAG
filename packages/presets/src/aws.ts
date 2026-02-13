import type { Embedder, GraphStorage, KVStorage, LLMExtractor, VectorStorage } from '@flowrag/core';
import { BedrockEmbedder, BedrockExtractor } from '@flowrag/provider-bedrock';
import type { OpenSearchVectorStorageOptions } from '@flowrag/storage-opensearch';
import { OpenSearchGraphStorage, OpenSearchVectorStorage } from '@flowrag/storage-opensearch';
import { S3KVStorage } from '@flowrag/storage-s3';

export interface AWSStorageOptions {
  /** S3 bucket for KV storage */
  bucket: string;
  /** S3 key prefix (default: 'flowrag/') */
  prefix?: string;
  /** OpenSearch client instance */
  opensearchClient: OpenSearchVectorStorageOptions['client'];
  /** Embedding dimensions (default: 1024 for Titan V2) */
  dimensions?: number;
  /** AWS region */
  region?: string;
  /** Override KV storage */
  kv?: KVStorage;
  /** Override vector storage */
  vector?: VectorStorage;
  /** Override graph storage */
  graph?: GraphStorage;
  /** Override embedder */
  embedder?: Embedder;
  /** Override LLM extractor */
  extractor?: LLMExtractor;
}

export interface AWSStorageConfig {
  storage: {
    kv: KVStorage;
    vector: VectorStorage;
    graph: GraphStorage;
  };
  embedder: Embedder;
  extractor: LLMExtractor;
}

/**
 * Create opinionated AWS storage configuration for FlowRAG.
 *
 * Uses:
 * - S3 for KV storage
 * - OpenSearch for vector storage (k-NN)
 * - OpenSearch for graph storage (entities + relations)
 * - Bedrock Titan V2 for embeddings
 * - Bedrock Claude Haiku 4.5 for entity extraction
 */
export function createAWSStorage(options: AWSStorageOptions): AWSStorageConfig {
  const dimensions = options.dimensions ?? 1024;

  return {
    storage: {
      kv:
        options.kv ??
        new S3KVStorage({
          bucket: options.bucket,
          prefix: options.prefix ?? 'flowrag/',
          region: options.region,
        }),
      vector:
        options.vector ??
        new OpenSearchVectorStorage({ client: options.opensearchClient, dimensions }),
      graph: options.graph ?? new OpenSearchGraphStorage({ client: options.opensearchClient }),
    },
    embedder: options.embedder ?? new BedrockEmbedder({ dimensions, region: options.region }),
    extractor: options.extractor ?? new BedrockExtractor({ region: options.region }),
  };
}
