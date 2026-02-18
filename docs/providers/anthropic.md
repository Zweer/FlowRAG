# Anthropic Provider

`@flowrag/provider-anthropic` provides entity extraction and reranking via the Anthropic Claude API.

::: warning
Anthropic does not offer an embedding model. Use a different provider for embeddings (e.g., Local, Gemini, OpenAI, or Bedrock).
:::

## Installation

```bash
npm install @flowrag/provider-anthropic
```

## Configuration

Set your API key:

```bash
export ANTHROPIC_API_KEY=your-key
```

## Extractor

```typescript
import { AnthropicExtractor } from '@flowrag/provider-anthropic';

const extractor = new AnthropicExtractor({
  model: 'claude-haiku-4-5-20251001', // default
});
```

Uses the Claude Messages API. JSON is extracted from the response text automatically.

## Reranker

```typescript
import { AnthropicReranker } from '@flowrag/provider-anthropic';

const reranker = new AnthropicReranker();
```

LLM-based relevance scoring via the Messages API.

## Model Constants

Well-known model IDs are exported as constants:

```typescript
import { AnthropicLLMModels } from '@flowrag/provider-anthropic';

AnthropicLLMModels.CLAUDE_OPUS_4_6;   // 'claude-opus-4-6'
AnthropicLLMModels.CLAUDE_SONNET_4_6; // 'claude-sonnet-4-6'
AnthropicLLMModels.CLAUDE_HAIKU_4_5;  // 'claude-haiku-4-5-20251001'
```

All `model` parameters accept any string, so you can use newer models as they become available.

## Full Example

```typescript
import { LocalEmbedder } from '@flowrag/provider-local';
import { AnthropicExtractor, AnthropicReranker } from '@flowrag/provider-anthropic';

const rag = createFlowRAG({
  schema,
  storage: { kv, vector, graph },
  embedder: new LocalEmbedder(),              // Anthropic has no embedder
  extractor: new AnthropicExtractor(),
  reranker: new AnthropicReranker(),          // optional
});
```
