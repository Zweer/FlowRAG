# @flowrag/provider-anthropic

Anthropic provider for FlowRAG — entity extraction and reranking via Claude.

> Anthropic does not offer an embedding model. Use a different provider for embeddings (e.g., Local, Gemini, OpenAI, or Bedrock).

## Installation

```bash
npm install @flowrag/provider-anthropic
```

## Usage

### Extractor

```typescript
import { AnthropicExtractor } from '@flowrag/provider-anthropic';

const extractor = new AnthropicExtractor({
  model: 'claude-haiku-4-5-20251001', // default
});
```

### Reranker

```typescript
import { AnthropicReranker } from '@flowrag/provider-anthropic';

const reranker = new AnthropicReranker();
```

### Model Constants

```typescript
import { AnthropicLLMModels } from '@flowrag/provider-anthropic';

AnthropicLLMModels.CLAUDE_HAIKU_4_5;  // 'claude-haiku-4-5-20251001'
AnthropicLLMModels.CLAUDE_SONNET_4_6; // 'claude-sonnet-4-6'
AnthropicLLMModels.CLAUDE_OPUS_4_6;   // 'claude-opus-4-6'
```

## Environment Variables

```bash
ANTHROPIC_API_KEY=your-key
```

## License

MIT
