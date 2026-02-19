import type {
  DocumentParser,
  Embedder,
  ExtractionResult,
  GraphStorage,
  KVStorage,
  LLMExtractor,
  Reranker,
  Schema,
  TokenUsage,
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
  parsers?: DocumentParser[];
  hooks?: FlowRAGHooks;
  observability?: ObservabilityHooks;
  options?: {
    indexing?: IndexingOptions;
    querying?: QueryOptions;
  };
}

export interface ObservabilityHooks {
  onLLMCall?: (event: { model: string; duration: number; usage?: TokenUsage }) => void;
  onEmbedding?: (event: { model: string; textsCount: number; duration: number }) => void;
  onSearch?: (event: {
    query: string;
    mode: string;
    resultsCount: number;
    duration: number;
  }) => void;
}

export interface IndexingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  maxParallelInsert?: number;
  llmMaxAsync?: number;
  embeddingMaxAsync?: number;
  extractionGleanings?: number;
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

export type ExportFormat = 'json' | 'csv' | 'dot';

export interface FlowRAG {
  index(input: string | string[], options?: IndexOptions): Promise<void>;
  deleteDocument(documentId: string): Promise<void>;
  mergeEntities(options: MergeEntitiesOptions): Promise<void>;
  search(query: string, options?: { mode?: QueryMode; limit?: number }): Promise<SearchResult[]>;
  traceDataFlow(entityId: string, direction: 'upstream' | 'downstream'): Promise<Entity[]>;
  findPath(fromId: string, toId: string, maxDepth?: number): Promise<Relation[]>;
  export(format: ExportFormat): Promise<string>;
  stats(): Promise<IndexStats>;
}

export interface MergeEntitiesOptions {
  sources: string[];
  target: string;
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  source: 'vector' | 'graph';
  sources: Source[];
  metadata?: Record<string, unknown>;
}

export interface Source {
  documentId: string;
  filePath?: string;
  chunkIndex: number;
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
