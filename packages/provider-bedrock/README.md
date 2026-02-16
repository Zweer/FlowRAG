# @flowrag/provider-bedrock

AWS Bedrock provider for FlowRAG — embeddings, entity extraction, and reranking.

## Installation

```bash
npm install @flowrag/provider-bedrock @aws-sdk/client-bedrock-runtime
```

## Usage

```typescript
import { BedrockEmbedder, BedrockExtractor, BedrockReranker } from '@flowrag/provider-bedrock';

const embedder = new BedrockEmbedder();   // amazon.titan-embed-text-v2:0
const extractor = new BedrockExtractor(); // anthropic.claude-haiku-4-5
const reranker = new BedrockReranker();   // amazon.rerank-v1:0
```

## Configuration

Uses standard AWS credentials (env vars, IAM role, SSO profile):

```bash
export AWS_REGION=eu-central-1
```

## License

MIT
