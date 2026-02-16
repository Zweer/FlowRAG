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
