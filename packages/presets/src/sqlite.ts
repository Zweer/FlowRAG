import { join } from 'node:path';

import type { Embedder, GraphStorage, KVStorage, LLMExtractor, VectorStorage } from '@flowrag/core';
import { GeminiExtractor } from '@flowrag/provider-gemini';
import { LocalEmbedder } from '@flowrag/provider-local';
import { JsonKVStorage } from '@flowrag/storage-json';
import { SQLiteGraphStorage, SQLiteVectorStorage } from '@flowrag/storage-sqlite';

export interface SQLiteStorageOptions {
  /** Base path for all storage (default: './data') */
  path?: string;
  /** Embedding dimensions (default: 384 for e5-small-v2) */
  dimensions?: number;
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

export interface SQLiteStorageConfig {
  storage: {
    kv: KVStorage;
    vector: VectorStorage;
    graph: GraphStorage;
  };
  embedder: Embedder;
  extractor: LLMExtractor;
}

/**
 * Create opinionated local storage configuration using SQLite for vectors.
 *
 * Lightweight alternative to `createLocalStorage` — replaces LanceDB with
 * sqlite-vec, reducing native binary dependencies.
 *
 * Uses:
 * - JSON files for KV storage
 * - SQLite + sqlite-vec for vector storage
 * - SQLite for graph storage
 * - Local ONNX embedder (Xenova/e5-small-v2)
 * - Gemini for entity extraction
 *
 * @param options Configuration options with overrides
 * @returns Storage configuration object
 */
export function createSQLiteStorage(
  options: string | SQLiteStorageOptions = {},
): SQLiteStorageConfig {
  const resolved = typeof options === 'string' ? { path: options } : options;
  const basePath = resolved.path ?? './data';
  const dimensions = resolved.dimensions ?? 384;

  return {
    storage: {
      kv: resolved.kv ?? new JsonKVStorage({ path: join(basePath, 'kv') }),
      vector:
        resolved.vector ??
        new SQLiteVectorStorage({
          path: join(basePath, 'vectors.db'),
          dimensions,
        }),
      graph: resolved.graph ?? new SQLiteGraphStorage({ path: join(basePath, 'graph.db') }),
    },
    embedder:
      resolved.embedder ?? new LocalEmbedder({ model: 'Xenova/e5-small-v2', dtype: 'fp32' }),
    extractor: resolved.extractor ?? new GeminiExtractor({ model: 'gemini-3-flash-preview' }),
  };
}
