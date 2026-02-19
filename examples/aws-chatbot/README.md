# AWS Enterprise Chatbot

Production-ready architecture for a documentation chatbot on AWS, handling thousands of documents with FlowRAG.

## Architecture

```
  Docs (Confluence, Git, etc.)
         │
         ▼
  ┌──────────────┐
  │  S3 (source)  │  Upload docs here (manually, CI/CD, or sync)
  └──────┬───────┘
         │
         │  EventBridge (daily) or S3 event trigger
         ▼
  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
  │ Index Lambda  │────►│  S3 (KV)     │     │  Bedrock     │
  │               │────►│  OpenSearch   │◄───►│  (AI)        │
  │ Batch indexing│     │  (Vec+Graph)  │     │  Titan Embed │
  └──────────────┘     └──────┬───────┘     │  Claude      │
                              │              └──────────────┘
                              │ reads
                              ▼
  API Gateway ──────► ┌──────────────┐
                      │ Query Lambda  │────► Bedrock (Claude)
  POST /chat          │              │       generates answer
  { question: "..." } │ FlowRAG      │
                      │ .search()    │
                      └──────────────┘
                              │
                              ▼
                      { answer: "...", sources: [...] }
```

## Storage

| Storage | Service | Purpose |
|---------|---------|---------|
| KV | S3 | Documents, chunks, LLM cache, content hashes |
| Vector | OpenSearch | Chunk embeddings for semantic search |
| Graph | OpenSearch | Entities and relations (knowledge graph) |

All data stays within AWS. No external API calls for storage.

## AI (Bedrock)

| Task | Model | Purpose |
|------|-------|---------|
| Embeddings | Titan Embed V2 (1024d) | Vectorize chunks for search |
| Extraction | Claude Haiku | Extract entities and relations from text |
| Generation | Claude Haiku | Generate chat answers from retrieved context |

Everything runs through Bedrock — no data leaves your AWS account.

## Lambda Code

### Index Lambda (`src/index-lambda.ts`)

Triggered daily by EventBridge (or on S3 upload):

1. Downloads docs from S3 source bucket to `/tmp`
2. Calls `rag.index()` — FlowRAG handles chunking, extraction, embedding, storage
3. Unchanged documents are skipped automatically (SHA-256 hashing)
4. Returns stats (docs, chunks, entities, relations)

Configuration:
- `maxParallelInsert: 5` — process 5 docs concurrently
- `llmMaxAsync: 10` — 10 concurrent Bedrock extraction calls
- `extractionGleanings: 1` — extra extraction pass for accuracy

### Query Lambda (`src/query-lambda.ts`)

Behind API Gateway, handles chat requests:

1. Receives `{ question, mode? }` via POST
2. `rag.search()` — dual retrieval (vector + graph), returns chunks with citations
3. Bedrock Claude generates a natural language answer from the retrieved context
4. Returns `{ answer, sources }` with document references

The FlowRAG instance is initialized outside the handler (reused across invocations for warm starts).

## API

### POST /chat

```json
{
  "question": "What services depend on Kafka?",
  "mode": "hybrid"
}
```

Response:

```json
{
  "answer": "Several services depend on Kafka for event-driven communication [1]: Order Service publishes order events [1], Payment Service handles payment events [2]...",
  "sources": [
    { "documentId": "doc:xxx", "filePath": "architecture.md", "chunkIndex": 2 },
    { "documentId": "doc:yyy", "filePath": "architecture.md", "chunkIndex": 3 }
  ]
}
```

## Infrastructure (what you need)

### AWS Resources

| Resource | Config |
|----------|--------|
| S3 bucket (source) | Upload your docs here |
| S3 bucket (data) | FlowRAG KV storage |
| OpenSearch domain | 1-3 nodes, `r6g.large` for thousands of docs |
| Index Lambda | 1024 MB, 5 min timeout, EventBridge trigger |
| Query Lambda | 512 MB, 30s timeout, API Gateway trigger |
| API Gateway | REST API with Lambda proxy integration |

### IAM Permissions

Index Lambda:
- `s3:GetObject`, `s3:ListBucket` on source bucket
- `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket` on data bucket
- `es:ESHttp*` on OpenSearch domain
- `bedrock:InvokeModel` for Titan Embed + Claude

Query Lambda:
- `s3:GetObject`, `s3:ListBucket` on data bucket
- `es:ESHttp*` on OpenSearch domain
- `bedrock:InvokeModel` for Titan Embed + Claude

### Environment Variables

Both Lambdas:
- `DATA_BUCKET` — S3 bucket name for FlowRAG data
- `OPENSEARCH_URL` — OpenSearch domain endpoint (e.g., `https://xxx.eu-west-1.es.amazonaws.com`)
- `AWS_REGION` — e.g., `eu-west-1`

Index Lambda only:
- `DOCS_BUCKET` — S3 bucket name with source documents

## Scaling

| Docs | OpenSearch | Index Time | Query Latency |
|------|-----------|------------|---------------|
| 100 | 1× r6g.medium | ~5 min | ~200ms |
| 1,000 | 1× r6g.large | ~30 min | ~200ms |
| 10,000 | 3× r6g.large | ~4 hours | ~300ms |
| 50,000+ | 3× r6g.xlarge | overnight | ~400ms |

Index time depends heavily on Bedrock extraction throughput. Query latency is dominated by OpenSearch search + Bedrock generation.

## Cost Estimate

For ~1,000 documents indexed daily:

| Service | Monthly Cost |
|---------|-------------|
| S3 (KV) | ~$1 |
| OpenSearch (1× r6g.large) | ~$150 |
| Bedrock Titan Embed (indexing) | ~$5 |
| Bedrock Claude (extraction) | ~$20 |
| Bedrock Claude (queries, ~1000/day) | ~$30 |
| Lambda | ~$2 |
| **Total** | **~$208/month** |

Use the [AWS Pricing Calculator](https://calculator.aws) for precise estimates based on your workload.

## vs Local Example

| | Local (enterprise-chatbot) | AWS (aws-chatbot) |
|---|---|---|
| Storage | Files on disk (Git-friendly) | S3 + OpenSearch |
| AI | OpenAI API | AWS Bedrock (data stays in AWS) |
| Scale | Hundreds of docs | Tens of thousands |
| Deploy | CLI / local script | Lambda + API Gateway |
| Cost | OpenAI API fees | ~$200/month |
| Data residency | Wherever you run it | Your AWS region |
