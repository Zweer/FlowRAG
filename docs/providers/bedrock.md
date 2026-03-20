# AWS Bedrock Provider

`@flowrag/provider-bedrock` provides embeddings, entity extraction, and reranking via AWS Bedrock.

## Installation

```bash
npm install @flowrag/provider-bedrock @aws-sdk/client-bedrock-runtime
```

## Configuration

Uses standard AWS credentials (environment variables, IAM role, SSO profile, etc.):

```bash
export AWS_REGION=eu-central-1
```

## Embedder

```typescript
import { BedrockEmbedder } from '@flowrag/provider-bedrock';

const embedder = new BedrockEmbedder({
  model: 'amazon.titan-embed-text-v2:0', // default
});

embedder.dimensions; // 1024
```

## Extractor

```typescript
import { BedrockExtractor } from '@flowrag/provider-bedrock';

const extractor = new BedrockExtractor({
  model: 'anthropic.claude-haiku-4-5-20251001-v1:0', // default
});
```

## Reranker

```typescript
import { BedrockReranker } from '@flowrag/provider-bedrock';

const reranker = new BedrockReranker();
// Uses amazon.rerank-v1:0
```

## Model Constants

Well-known model IDs are exported as constants:

```typescript
import { BedrockEmbeddingModels, BedrockLLMModels, BedrockRerankerModels } from '@flowrag/provider-bedrock';

BedrockEmbeddingModels.TITAN_EMBED_V2;    // 'amazon.titan-embed-text-v2:0'
BedrockEmbeddingModels.COHERE_EMBED_V4;   // 'cohere.embed-v4:0'
BedrockLLMModels.CLAUDE_HAIKU_4_5;        // 'anthropic.claude-haiku-4-5-20251001-v1:0'
BedrockLLMModels.CLAUDE_SONNET_4_6;       // 'anthropic.claude-sonnet-4-6'
BedrockRerankerModels.COHERE_RERANK_V3_5; // 'cohere.rerank-v3-5:0'
```

All `model` parameters accept any string, so you can use newer models as they become available.

## Enterprise Recommendations

### Embedding

| Pick | Model | Why |
|------|-------|-----|
| 🏆 Best value | Titan Embed V2 | Cheap, 1024 dims, wide regional availability |
| 👑 Best quality | Cohere Embed V4 | Latest gen, text+image, superior benchmarks |
| 🌍 Multilingual | Cohere Embed Multilingual V3 | 100+ languages, 1024 dims |

### LLM (Entity Extraction)

| Pick | Model | Why |
|------|-------|-----|
| 🏆 Best value | Claude Haiku 4.5 | Fast, $1/$5 per 1M tokens, reliable structured output |
| 👑 Best quality | Claude Sonnet 4.6 | Latest Sonnet, excellent extraction, wide cross-region |
| 💎 Top tier | Claude Opus 4.6 | Absolute best, use for critical extraction |
| 💰 Budget | Nova Lite | 20x cheaper than Haiku, sufficient for simple schemas |

### Reranker

| Pick | Model | Why |
|------|-------|-----|
| 🏆 Best value | Amazon Rerank V1 | Dedicated reranker, $1/1000 queries |
| 👑 Best quality | Cohere Rerank 3.5 | SOTA on BEIR, multilingual, reasoning |

::: tip
Cohere models (Embed, Rerank) use a different body format than Amazon/Anthropic models. FlowRAG handles this automatically — just pass the model ID.
:::

## Full Example (Lambda)

```typescript
import { BedrockEmbedder, BedrockExtractor, BedrockReranker } from '@flowrag/provider-bedrock';
import { S3KVStorage } from '@flowrag/storage-s3';
import { OpenSearchVectorStorage, OpenSearchGraphStorage } from '@flowrag/storage-opensearch';

const rag = createFlowRAG({
  schema,
  storage: {
    kv: new S3KVStorage({ client: s3Client, bucket: 'my-rag-bucket', prefix: 'kv/' }),
    vector: new OpenSearchVectorStorage({ client: osClient, dimensions: 1024 }),
    graph: new OpenSearchGraphStorage({ client: osClient }),
  },
  embedder: new BedrockEmbedder(),
  extractor: new BedrockExtractor(),
  reranker: new BedrockReranker(), // optional
});
```

See [AWS Lambda Deployment](/deployment/aws-lambda) for a complete example.
