---
title: Why We Built a TypeScript RAG Library (and Why You Might Want One Too)
published: false
description: RAG in TypeScript? Without Python? Without servers? We built FlowRAG — a library with knowledge graphs, Lambda-friendly, Git-friendly storage, and 100% test coverage.
tags: typescript, ai, rag, opensource
cover_image: https://zweer.github.io/FlowRAG/og-image.png
canonical_url: https://zweer.github.io/FlowRAG/blog/why-flowrag
---

We had a simple need: index technical documentation and query it with an AI assistant. The docs described microservices, protocols, data flows — things that are inherently **connected**.

We looked at existing RAG solutions. They were all Python. They all required running a server. They all assumed you had Neo4j or Postgres running somewhere.

For a TypeScript project deployed on Lambda, none of this worked.

## What We Wanted

- **A library, not a server.** Import it, use it, done. No Docker, no processes.
- **TypeScript native.** Our entire stack is TypeScript. Adding Python for one feature felt wrong.
- **Lambda-friendly.** Stateless queries, fast cold starts, no persistent connections.
- **Git-friendly storage.** Commit the knowledge base to the repo. Clone and query anywhere.
- **Knowledge graphs.** Vector search finds similar text. But we needed to trace data flows: *"Where does this event go? What services consume it?"*

## RAG Isn't ML — It's Plumbing

Search "RAG library" and you'll find Python everywhere. LangChain, LlamaIndex, LightRAG, RAGFlow — all Python.

But here's the thing: RAG is reading files, calling APIs, storing data, and serving results. That's what backend frameworks do. And many backend teams write TypeScript.

If your API is Express/Fastify, your frontend is React/Vue, and your infra is CDK/SST — adding Python for one feature means a separate runtime, virtual environments, different CI/CD pipelines, and context switching for developers.

RAG calls an API for embeddings, calls an API for extraction, and stores the results. That's I/O, not computation. TypeScript handles that just fine.

## The Architecture

Inspired by [LightRAG](https://github.com/HKUDS/LightRAG), we separated storage into three layers:

| Storage | Purpose | Local | Cloud |
|---------|---------|-------|-------|
| **KV** | Documents, chunks, cache | JSON files | S3 |
| **Vector** | Embeddings for semantic search | LanceDB or sqlite-vec | OpenSearch |
| **Graph** | Entities and relations | SQLite | OpenSearch |

| Aspect | LightRAG | FlowRAG |
|--------|----------|---------|
| Language | Python | TypeScript |
| Model | Server (always running) | Library (import and use) |
| Indexing | Continuous | Batch |
| Deploy | Container/server | Lambda-friendly |
| Storage | Neo4j, Postgres | SQLite, LanceDB/sqlite-vec, JSON files |

## Quick Start — 10 Lines

```typescript
import { defineSchema } from '@flowrag/core';
import { createFlowRAG } from '@flowrag/pipeline';
import { createLocalStorage } from '@flowrag/presets';

const schema = defineSchema({
  entityTypes: ['SERVICE', 'DATABASE', 'PROTOCOL'],
  relationTypes: ['USES', 'PRODUCES', 'CONSUMES'],
});

const rag = createFlowRAG({
  schema,
  ...createLocalStorage('./data'),
});

await rag.index('./content');
const results = await rag.search('how does authentication work');
```

## What Happens Under the Hood

When you call `rag.index()`, five stages run in sequence:

```
Files → Scanner → Chunker → Extractor (LLM) → Embedder → Storage
```

1. **Scanner** reads files from the input path
2. **Chunker** splits documents into ~1200 token chunks with overlap
3. **Extractor** — an LLM reads each chunk and extracts entities and relations
4. **Embedder** generates vector embeddings for semantic search
5. **Storage** saves everything to KV (documents), Vector (embeddings), and Graph (entities + relations)

Extraction results are cached, so re-indexing the same content is instant. Changed documents are detected via SHA-256 hashing — only modified files get reprocessed.

When you call `rag.search()`, dual retrieval kicks in: the query is embedded and searched against vectors, while entities mentioned in the query are looked up in the graph and their connections are traversed. Results from both paths are merged and deduplicated.

Same API works on AWS — just swap the storage backends:

```typescript
const rag = createFlowRAG({
  schema,
  storage: {
    kv: new S3KVStorage({ bucket: 'my-rag-bucket' }),
    vector: new OpenSearchVectorStorage({ dimensions: 1024 }),
    graph: new OpenSearchGraphStorage(),
  },
  embedder: new BedrockEmbedder(),
  extractor: new BedrockExtractor(),
});
```

## Knowledge Graphs: The Killer Feature

Most RAG systems do vector search only. That works for "find me text about X." But it fails for:

- *"What services depend on the payment gateway?"*
- *"Trace the data flow from user signup to the analytics dashboard"*
- *"What happens if the auth service goes down?"*

These questions are about **relationships**, not text similarity.

FlowRAG builds a knowledge graph automatically during indexing. An LLM reads each chunk and extracts entities and relations:

```
[Auth Service] --USES--> [PostgreSQL]
[Auth Service] --PRODUCES--> [JWT Token]
[API Gateway] --DEPENDS_ON--> [Auth Service]
```

Then at query time, **dual retrieval** combines both approaches:

1. **Vector search** — finds semantically similar chunks
2. **Graph traversal** — follows entity relationships for connected context
3. **Merge & dedupe** — combines results

You can also trace data flows directly:

```typescript
const flow = await rag.traceDataFlow('user-event', 'downstream');
// user-event → Kafka → Analytics → Dashboard

const path = await rag.findPath('ServiceA', 'ServiceB');
// ServiceA → Kafka → ServiceB
```

Try doing that with vector search alone.

## What's Inside

FlowRAG is a monorepo with 18 packages:

- **6 storage backends**: JSON, SQLite (graph + vector), LanceDB, S3, OpenSearch, Redis
- **5 AI providers**: Local ONNX, Gemini, OpenAI, Anthropic, AWS Bedrock
- **Reranking**: Local cross-encoder, Gemini, OpenAI, Bedrock
- **CLI**: `flowrag index ./content && flowrag search "query"`
- **MCP server**: AI assistants (Claude, Kiro) can query your knowledge base directly
- **100% test coverage** on every package

## Who Is This For?

**You're a TypeScript developer** and you need RAG without the complexity of Python servers.

**You deploy on Lambda** and need stateless queries with fast cold starts.

**You want knowledge graphs** — not just vector search — to understand how things connect.

**You want Git-friendly storage** — commit your knowledge base, clone and query anywhere.

## Try It

```bash
npm install @flowrag/pipeline @flowrag/presets
```

- 📖 [Documentation](https://zweer.github.io/FlowRAG/)
- 🐙 [GitHub](https://github.com/Zweer/FlowRAG)
- 📦 [npm](https://www.npmjs.com/package/@flowrag/core)

Star the repo if you find it useful — it helps others discover it. And if you have questions, open a [Discussion](https://github.com/Zweer/FlowRAG/discussions).

---

*FlowRAG is MIT licensed and inspired by [LightRAG](https://github.com/HKUDS/LightRAG).*
