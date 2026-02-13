# Gemini Provider

`@flowrag/provider-gemini` provides embeddings, entity extraction, and reranking via Google's Gemini API.

## Installation

```bash
npm install @flowrag/provider-gemini
```

## Configuration

Set your API key:

```bash
export GEMINI_API_KEY=your-key
```

## Embedder

```typescript
import { GeminiEmbedder } from '@flowrag/provider-gemini';

const embedder = new GeminiEmbedder({
  model: 'text-embedding-004', // default
});

embedder.dimensions; // 768
```

## Extractor

```typescript
import { GeminiExtractor } from '@flowrag/provider-gemini';

const extractor = new GeminiExtractor({
  model: 'gemini-2.5-flash', // default
});
```

The extractor sends your schema (entity types, relation types, custom fields) to Gemini and receives structured entity/relation data.

## Reranker

```typescript
import { GeminiReranker } from '@flowrag/provider-gemini';

const reranker = new GeminiReranker();
```

Uses LLM-based relevance scoring — each result is evaluated against the query.

## Full Example

```typescript
import { GeminiEmbedder, GeminiExtractor, GeminiReranker } from '@flowrag/provider-gemini';

const rag = createFlowRAG({
  schema,
  storage: { kv, vector, graph },
  embedder: new GeminiEmbedder(),
  extractor: new GeminiExtractor(),
  reranker: new GeminiReranker(), // optional
});
```
