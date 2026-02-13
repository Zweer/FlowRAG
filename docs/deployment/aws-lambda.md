# AWS Lambda Deployment

FlowRAG is designed for serverless. Stateless queries, fast cold starts, no always-on containers.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐
│  Index Lambda    │     │  Query Lambda     │
│  (daily batch)   │     │  (on-demand)      │
└────────┬────────┘     └────────┬──────────┘
         │                       │
    ┌────┴───────────────────────┴────┐
    │           AWS Services          │
    │  ┌─────┐  ┌──────────┐  ┌────┐ │
    │  │  S3 │  │OpenSearch │  │ BR │ │
    │  │ (KV)│  │(Vec+Graph)│  │(AI)│ │
    │  └─────┘  └──────────┘  └────┘ │
    └─────────────────────────────────┘
```

## Storage Setup

```typescript
import { S3Client } from '@aws-sdk/client-s3';
import { Client } from '@opensearch-project/opensearch';
import { S3KVStorage } from '@flowrag/storage-s3';
import { OpenSearchVectorStorage, OpenSearchGraphStorage } from '@flowrag/storage-opensearch';

const s3Client = new S3Client({ region: 'eu-central-1' });
const osClient = new Client({
  node: 'https://my-domain.eu-central-1.es.amazonaws.com',
  // Use SigV4 auth for production
});

const storage = {
  kv: new S3KVStorage({ client: s3Client, bucket: 'my-rag-bucket', prefix: 'kv/' }),
  vector: new OpenSearchVectorStorage({ client: osClient, dimensions: 1024 }),
  graph: new OpenSearchGraphStorage({ client: osClient }),
};
```

## Query Lambda

```typescript
import { defineSchema } from '@flowrag/core';
import { createFlowRAG } from '@flowrag/pipeline';
import { BedrockEmbedder, BedrockExtractor } from '@flowrag/provider-bedrock';

const schema = defineSchema({
  entityTypes: ['SERVICE', 'DATABASE', 'PROTOCOL'],
  relationTypes: ['USES', 'PRODUCES', 'CONSUMES'],
});

export const handler = async (event: { query: string }) => {
  const rag = createFlowRAG({
    schema,
    storage,
    embedder: new BedrockEmbedder(),
    extractor: new BedrockExtractor(),
  });

  return rag.search(event.query);
};
```

## Index Lambda

Run on a schedule (e.g., daily via EventBridge):

```typescript
export const handler = async () => {
  const rag = createFlowRAG({
    schema,
    storage,
    embedder: new BedrockEmbedder(),
    extractor: new BedrockExtractor(),
  });

  // Download docs to /tmp, then index
  await rag.index('/tmp/content');
};
```

## OpenSearch Configuration

FlowRAG accepts a pre-configured `Client` instance, giving you full control over authentication:

- **SigV4** for Amazon OpenSearch Service
- **Basic auth** for self-managed clusters
- **IAM roles** for cross-account access

See the [OpenSearch docs](https://opensearch.org/docs/latest/clients/javascript/) for client configuration options.

## IAM Permissions

The Lambda execution role needs:

| Service | Actions |
|---------|---------|
| S3 | `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket` |
| OpenSearch | `es:ESHttp*` |
| Bedrock | `bedrock:InvokeModel` |
