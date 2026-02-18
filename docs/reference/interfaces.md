# Interfaces

FlowRAG is built on pluggable interfaces. Implement any of these to add custom storage backends or AI providers.

## Storage

### KVStorage

Key-value storage for documents, chunks, LLM cache, and document hashes.

```typescript
interface KVStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
  clear(): Promise<void>;
}
```

**Implementations**: `JsonKVStorage` (files), `S3KVStorage` (S3), `RedisKVStorage` (Redis)

### VectorStorage

Vector embeddings for semantic search.

```typescript
interface VectorStorage {
  upsert(records: VectorRecord[]): Promise<void>;
  search(vector: number[], limit: number, filter?: Filter): Promise<SearchResult[]>;
  delete(ids: string[]): Promise<void>;
  count(): Promise<number>;
}
```

**Implementations**: `LanceDBVectorStorage`, `OpenSearchVectorStorage`, `RedisVectorStorage`

### GraphStorage

Knowledge graph with entities and relations.

```typescript
interface GraphStorage {
  addEntity(entity: Entity): Promise<void>;
  addRelation(relation: Relation): Promise<void>;
  getEntity(id: string): Promise<Entity | null>;
  getEntities(filter?: EntityFilter): Promise<Entity[]>;
  getRelations(entityId: string, direction?: 'in' | 'out' | 'both'): Promise<Relation[]>;
  traverse(startId: string, depth: number, relationTypes?: string[]): Promise<Entity[]>;
  findPath(fromId: string, toId: string, maxDepth?: number): Promise<Relation[]>;
  deleteEntity(id: string): Promise<void>;
  deleteRelation(id: string): Promise<void>;
}
```

**Implementations**: `SQLiteGraphStorage`, `OpenSearchGraphStorage`

## AI Providers

### Embedder

```typescript
interface Embedder {
  readonly dimensions: number;
  readonly modelName: string;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}
```

**Implementations**: `LocalEmbedder` (ONNX), `GeminiEmbedder`, `BedrockEmbedder`, `OpenAIEmbedder`

### LLMExtractor

```typescript
interface LLMExtractor {
  extractEntities(
    content: string,
    knownEntities: string[],
    schema: Schema,
  ): Promise<ExtractionResult>;
}

interface ExtractionResult {
  entities: ExtractedEntity[];
  relations: ExtractedRelation[];
}
```

**Implementations**: `GeminiExtractor`, `BedrockExtractor`, `OpenAIExtractor`, `AnthropicExtractor`

### Reranker

```typescript
interface Reranker {
  rerank(query: string, documents: RerankDocument[], limit?: number): Promise<RerankResult[]>;
}

interface RerankDocument {
  id: string;
  content: string;
  score: number;
}

interface RerankResult {
  id: string;
  score: number;
  index: number;
}
```

**Implementations**: `LocalReranker` (ONNX), `GeminiReranker`, `BedrockReranker`, `OpenAIReranker`, `AnthropicReranker`

## Core Types

```typescript
interface Entity {
  id: string;
  name: string;
  type: string;
  description: string;
  sourceChunkIds: string[];
  fields?: Record<string, unknown>;
}

interface Relation {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  description: string;
  keywords: string[];
  sourceChunkIds: string[];
  fields?: Record<string, unknown>;
}
```
