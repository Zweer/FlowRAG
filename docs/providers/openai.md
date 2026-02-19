# OpenAI Provider

`@flowrag/provider-openai` provides embeddings, entity extraction, and reranking via the OpenAI API — or any OpenAI-compatible endpoint.

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

## OpenAI-Compatible Endpoints

All classes accept a `baseURL` option, so you can point them at any OpenAI-compatible API:

```typescript
// Ollama (local, free)
const embedder = new OpenAIEmbedder({
  baseURL: 'http://localhost:11434/v1',
  model: 'nomic-embed-text',
  dimensions: 768,
});

// Azure OpenAI
const extractor = new OpenAIExtractor({
  baseURL: 'https://my-company.openai.azure.com',
  apiKey: process.env.AZURE_OPENAI_KEY,
  model: 'gpt-4o',
});

// Together, Groq, Mistral, vLLM, LiteLLM...
const reranker = new OpenAIReranker({
  baseURL: 'https://api.together.xyz/v1',
  apiKey: process.env.TOGETHER_API_KEY,
  model: 'meta-llama/Llama-3-70b',
});
```

This works with any service that implements the OpenAI API format, including:
- [Ollama](https://ollama.com) — local models, no API key needed
- [Azure OpenAI](https://azure.microsoft.com/en-us/products/ai-services/openai-service)
- [vLLM](https://docs.vllm.ai) — self-hosted inference
- [LiteLLM](https://docs.litellm.ai) — unified proxy for 100+ providers
- [Together AI](https://www.together.ai)
- [Groq](https://groq.com)
- [Mistral](https://mistral.ai)

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
