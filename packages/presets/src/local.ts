import { join } from 'node:path';

import type { Embedder, GraphStorage, KVStorage, LLMExtractor, VectorStorage } from '@flowrag/core';
import { GeminiExtractor } from '@flowrag/provider-gemini';
import { LocalEmbedder } from '@flowrag/provider-local';
import { JsonKVStorage } from '@flowrag/storage-json';
import { LanceDBVectorStorage } from '@flowrag/storage-lancedb';
import { SQLiteGraphStorage } from '@flowrag/storage-sqlite';

export interface LocalStorageOptions {
  /** Base path for all storage (default: './data') */
  path?: string;
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

export interface LocalStorageConfig {
  storage: {
    kv: KVStorage;
    vector: VectorStorage;
    graph: GraphStorage;
  };
  embedder: Embedder;
  extractor: LLMExtractor;
}

/**
 * Create opinionated local storage configuration for FlowRAG.
 *
 * Uses:
 * - JSON files for KV storage
 * - SQLite for graph storage
 * - LanceDB for vector storage
 * - Local ONNX embedder (Xenova/e5-small-v2)
 * - Gemini for entity extraction
 *
 * @param options Configuration options with overrides
 * @returns Storage configuration object
 */
export function createLocalStorage(options: string | LocalStorageOptions = {}): LocalStorageConfig {
  const resolved = typeof options === 'string' ? { path: options } : options;
  const basePath = resolved.path ?? './data';

  return {
    storage: {
      kv: resolved.kv ?? new JsonKVStorage({ path: join(basePath, 'kv') }),
      vector: resolved.vector ?? new LanceDBVectorStorage({ path: join(basePath, 'vectors') }),
      graph: resolved.graph ?? new SQLiteGraphStorage({ path: join(basePath, 'graph.db') }),
    },
    embedder:
      resolved.embedder ?? new LocalEmbedder({ model: 'Xenova/e5-small-v2', dtype: 'fp32' }),
    extractor: resolved.extractor ?? new GeminiExtractor({ model: 'gemini-3-flash-preview' }),
  };
}
