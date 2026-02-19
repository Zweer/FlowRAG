# Configuration

## FlowRAGConfig

The main configuration object passed to `createFlowRAG()`:

```typescript
interface FlowRAGConfig {
  schema: Schema;
  storage: {
    kv: KVStorage;
    vector: VectorStorage;
    graph: GraphStorage;
  };
  embedder: Embedder;
  extractor: LLMExtractor;
  reranker?: Reranker;
  evaluator?: Evaluator;
  parsers?: DocumentParser[];
  hooks?: FlowRAGHooks;
  observability?: ObservabilityHooks;
  options?: {
    indexing?: IndexingOptions;
    querying?: QueryOptions;
  };
}
```

## IndexingOptions

```typescript
interface IndexingOptions {
  chunkSize?: number;          // Tokens per chunk (default: 1200)
  chunkOverlap?: number;       // Overlap between chunks (default: 100)
  maxParallelInsert?: number;  // Concurrent documents (default: 2)
  llmMaxAsync?: number;        // Concurrent LLM calls (default: 4)
  embeddingMaxAsync?: number;  // Concurrent embedding calls (default: 16)
  extractionGleanings?: number; // Additional extraction passes (default: 0)
}
```

## IndexOptions

Per-call options for `rag.index()`:

```typescript
interface IndexOptions {
  force?: boolean;  // Skip hash check, re-process all (default: false)
}
```

## QueryOptions

```typescript
interface QueryOptions {
  defaultMode?: QueryMode;  // 'hybrid' | 'local' | 'global' | 'naive' (default: 'hybrid')
  maxResults?: number;      // Max results returned (default: 10)
  vectorWeight?: number;    // Weight for vector results (default: 0.7)
  graphWeight?: number;     // Weight for graph results (default: 0.3)
}
```

## Hooks

```typescript
interface FlowRAGHooks {
  onEntitiesExtracted?: (
    extraction: ExtractionResult,
    context: ExtractionContext,
  ) => Promise<ExtractionResult>;
}

interface ExtractionContext {
  chunkId: string;
  documentId: string;
  content: string;
}
```

## Observability Hooks

```typescript
interface ObservabilityHooks {
  onLLMCall?: (event: { model: string; duration: number; usage?: TokenUsage }) => void;
  onEmbedding?: (event: { model: string; textsCount: number; duration: number }) => void;
  onSearch?: (event: { query: string; mode: string; resultsCount: number; duration: number }) => void;
}
```

Hooks are called from both indexing and querying pipelines with timing information. The `onLLMCall` hook includes token usage when the provider supports it (e.g., OpenAI extractor).

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Gemini API key | For Gemini provider |
| `OPENAI_API_KEY` | OpenAI API key | For OpenAI provider |
| `ANTHROPIC_API_KEY` | Anthropic API key | For Anthropic provider |
| `AWS_REGION` | AWS region | For Bedrock/S3/OpenSearch |
