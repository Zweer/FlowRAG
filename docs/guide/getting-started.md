# Getting Started

## Installation

For a complete local setup with presets:

```bash
npm install @flowrag/pipeline @flowrag/presets
```

Or install individual packages:

```bash
npm install @flowrag/core @flowrag/pipeline \
  @flowrag/storage-json @flowrag/storage-sqlite @flowrag/storage-lancedb \
  @flowrag/provider-local @flowrag/provider-gemini
```

For AWS cloud deployment:

```bash
npm install @flowrag/provider-bedrock @flowrag/storage-s3 @flowrag/storage-opensearch
```

## Quick Start

```typescript
import { defineSchema } from '@flowrag/core';
import { createFlowRAG } from '@flowrag/pipeline';
import { createLocalStorage } from '@flowrag/presets';

// 1. Define your schema
const schema = defineSchema({
  entityTypes: ['SERVICE', 'DATABASE', 'PROTOCOL'],
  relationTypes: ['USES', 'PRODUCES', 'CONSUMES'],
});

// 2. Create RAG instance
const rag = createFlowRAG({
  schema,
  ...createLocalStorage('./data'),
});

// 3. Index documents
await rag.index('./content');

// 4. Search
const results = await rag.search('how does authentication work');
```

That's it. FlowRAG scans your files, chunks them, extracts entities and relations via LLM, generates embeddings, and stores everything locally.

## What Happens Under the Hood

When you call `rag.index()`:

1. **Scanner** reads files from the input path
2. **Chunker** splits documents into ~1200 token chunks with overlap
3. **Extractor** (LLM) identifies entities and relations in each chunk
4. **Embedder** generates vector embeddings for semantic search
5. **Storage** saves documents, vectors, and the knowledge graph

When you call `rag.search()`:

1. Your query is embedded into a vector
2. **Vector search** finds semantically similar chunks
3. **Graph traversal** follows entity relationships for connected context
4. Results are merged, deduplicated, and optionally reranked

## What's Next?

- [Schema Definition](/guide/schema) — custom entity types, relation types, and fields
- [Indexing](/guide/indexing) — chunking, caching, incremental indexing
- [Querying](/guide/querying) — query modes, dual retrieval, data flow tracing
- [Providers](/providers/local) — choose your embedder, extractor, and reranker
- [Deployment](/deployment/local) — local CLI or AWS Lambda
