# Lambda Query Example 🚀

Minimal AWS Lambda that queries a FlowRAG index stored on S3 + OpenSearch.

## Architecture

```
API Gateway → Lambda → FlowRAG
                         ├── S3 (KV storage)
                         ├── OpenSearch (vector + graph)
                         └── Bedrock (embeddings)
```

## Setup

### 1. Prerequisites

- S3 bucket with indexed FlowRAG data
- OpenSearch domain (managed or serverless)
- Bedrock model access enabled (Titan Embed V2)

### 2. Environment Variables

```bash
S3_BUCKET=my-rag-bucket          # S3 bucket name
S3_PREFIX=flowrag/               # S3 key prefix (optional)
OPENSEARCH_ENDPOINT=https://...  # OpenSearch domain endpoint
AWS_REGION=eu-central-1          # AWS region
```

### 3. IAM Permissions

The Lambda execution role needs:

```json
{
  "Effect": "Allow",
  "Action": [
    "s3:GetObject",
    "s3:ListBucket"
  ],
  "Resource": [
    "arn:aws:s3:::my-rag-bucket",
    "arn:aws:s3:::my-rag-bucket/*"
  ]
},
{
  "Effect": "Allow",
  "Action": [
    "es:ESHttpGet",
    "es:ESHttpPost"
  ],
  "Resource": "arn:aws:es:*:*:domain/my-domain/*"
},
{
  "Effect": "Allow",
  "Action": "bedrock:InvokeModel",
  "Resource": "arn:aws:bedrock:*::foundation-model/amazon.titan-embed-text-v2:0"
}
```

### 4. Deploy

Bundle with esbuild or your preferred bundler:

```bash
esbuild handler.ts --bundle --platform=node --target=node20 --outfile=dist/handler.js
```

## Usage

```bash
# Via API Gateway
curl -X POST https://xxx.execute-api.eu-central-1.amazonaws.com/query \
  -H "Content-Type: application/json" \
  -d '{"query": "how does authentication work", "mode": "hybrid", "limit": 10}'
```
