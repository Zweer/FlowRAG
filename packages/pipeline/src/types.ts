import type {
  Embedder,
  ExtractionResult,
  GraphStorage,
  KVStorage,
  LLMExtractor,
  Reranker,
  Schema,
  VectorStorage,
} from '@flowrag/core';

export interface ExtractionContext {
  chunkId: string;
  documentId: string;
  content: string;
}

export interface FlowRAGHooks {
  onEntitiesExtracted?: (
    extraction: ExtractionResult,
    context: ExtractionContext,
  ) => Promise<ExtractionResult>;
}

export interface FlowRAGConfig {
  schema: Schema;
  storage: {
    kv: KVStorage;
    vector: VectorStorage;
    graph: GraphStorage;
  };
  embedder: Embedder;
  extractor: LLMExtractor;
  reranker?: Reranker;
  hooks?: FlowRAGHooks;
  options?: {
    indexing?: IndexingOptions;
    querying?: QueryOptions;
  };
}

export interface IndexingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  maxParallelInsert?: number;
  llmMaxAsync?: number;
  embeddingMaxAsync?: number;
}

export interface QueryOptions {
  defaultMode?: QueryMode;
  maxResults?: number;
  vectorWeight?: number;
  graphWeight?: number;
}

export type QueryMode = 'local' | 'global' | 'hybrid' | 'naive';

export interface IndexOptions {
  force?: boolean;
  onProgress?: (event: IndexProgress) => void;
}

export interface IndexProgress {
  type:
    | 'scan'
    | 'document:skip'
    | 'document:start'
    | 'document:done'
    | 'document:delete'
    | 'chunk:done'
    | 'done';
  documentId?: string;
  chunkId?: string;
  documentsTotal: number;
  documentsProcessed: number;
  chunksTotal: number;
  chunksProcessed: number;
}

export interface FlowRAG {
  index(input: string | string[], options?: IndexOptions): Promise<void>;
  deleteDocument(documentId: string): Promise<void>;
  search(query: string, options?: { mode?: QueryMode; limit?: number }): Promise<SearchResult[]>;
  traceDataFlow(entityId: string, direction: 'upstream' | 'downstream'): Promise<Entity[]>;
  findPath(fromId: string, toId: string, maxDepth?: number): Promise<Relation[]>;
  stats(): Promise<IndexStats>;
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  source: 'vector' | 'graph';
  metadata?: Record<string, unknown>;
}

export interface IndexStats {
  documents: number;
  chunks: number;
  entities: number;
  relations: number;
  vectors: number;
}

import type { Entity, Relation } from '@flowrag/core';

export interface Document {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface Chunk {
  id: string;
  content: string;
  documentId: string;
  startToken: number;
  endToken: number;
}

// Re-export from core for convenience
export type { Entity, Relation } from '@flowrag/core';
