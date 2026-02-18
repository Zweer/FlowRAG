# OpenAI Provider

`@flowrag/provider-openai` provides embeddings, entity extraction, and reranking via the OpenAI API.

## Installation

```bash
npm install @flowrag/provider-openai
```

## Configuration

Set your API key:

```bash
export OPENAI_API_KEY=your-key
```

## Embedder

```typescript
import { OpenAIEmbedder } from '@flowrag/provider-openai';

const embedder = new OpenAIEmbedder({
  model: 'text-embedding-3-small', // default
  dimensions: 1536,                // default
});

embedder.dimensions; // 1536
```

Available models:

| Model | Default Dimensions |
|-------|-------------------|
| `text-embedding-3-small` | 1536 |
| `text-embedding-3-large` | 3072 |

The `dimensions` parameter can be customized — OpenAI supports [shortening embeddings](https://platform.openai.com/docs/guides/embeddings).

## Extractor

```typescript
import { OpenAIExtractor } from '@flowrag/provider-openai';

const extractor = new OpenAIExtractor({
  model: 'gpt-5-mini', // default
});
```

Uses JSON mode (`response_format: { type: 'json_object' }`) for reliable structured output.

## Reranker

```typescript
import { OpenAIReranker } from '@flowrag/provider-openai';

const reranker = new OpenAIReranker();
```

LLM-based relevance scoring — each result is evaluated against the query.

## Model Constants

Well-known model IDs are exported as constants:

```typescript
import { OpenAIEmbeddingModels, OpenAILLMModels } from '@flowrag/provider-openai';

OpenAIEmbeddingModels.TEXT_EMBEDDING_3_SMALL; // 'text-embedding-3-small'
OpenAIEmbeddingModels.TEXT_EMBEDDING_3_LARGE; // 'text-embedding-3-large'

OpenAILLMModels.GPT_5_MINI; // 'gpt-5-mini'
OpenAILLMModels.GPT_5;      // 'gpt-5'
OpenAILLMModels.GPT_5_2;    // 'gpt-5.2'
```

All `model` parameters accept any string, so you can use newer models as they become available.

## Full Example

```typescript
import { OpenAIEmbedder, OpenAIExtractor, OpenAIReranker } from '@flowrag/provider-openai';

const rag = createFlowRAG({
  schema,
  storage: { kv, vector, graph },
  embedder: new OpenAIEmbedder(),
  extractor: new OpenAIExtractor(),
  reranker: new OpenAIReranker(), // optional
});
```
