# @flowrag/provider-openai

OpenAI provider for FlowRAG — embeddings, entity extraction, and reranking. Works with any OpenAI-compatible endpoint.

## Installation

```bash
npm install @flowrag/provider-openai
```

## Usage

### Embedder

```typescript
import { OpenAIEmbedder } from '@flowrag/provider-openai';

const embedder = new OpenAIEmbedder({
  model: 'text-embedding-3-small', // default
  dimensions: 1536,                // default
});
```

### Extractor

```typescript
import { OpenAIExtractor } from '@flowrag/provider-openai';

const extractor = new OpenAIExtractor({
  model: 'gpt-5-mini', // default
});
```

### Reranker

```typescript
import { OpenAIReranker } from '@flowrag/provider-openai';

const reranker = new OpenAIReranker();
```

### OpenAI-Compatible Endpoints

All classes accept a `baseURL` option for Ollama, Azure OpenAI, vLLM, Together, Groq, etc.:

```typescript
const embedder = new OpenAIEmbedder({
  baseURL: 'http://localhost:11434/v1', // Ollama
  model: 'nomic-embed-text',
  dimensions: 768,
});
```

### Model Constants

```typescript
import { OpenAIEmbeddingModels, OpenAILLMModels } from '@flowrag/provider-openai';

OpenAIEmbeddingModels.TEXT_EMBEDDING_3_SMALL; // 'text-embedding-3-small'
OpenAILLMModels.GPT_5_MINI;                  // 'gpt-5-mini'
```

## Environment Variables

```bash
OPENAI_API_KEY=your-key
```

## License

MIT
