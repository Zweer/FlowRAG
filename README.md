# FlowRAG 🌊

TypeScript RAG library with knowledge graph support.

## What is FlowRAG?

A **lightweight, modular RAG library** for TypeScript/Node.js that:

- Works as a **library** (not a server) - import and use
- Optimized for **batch indexing** + query-only mode
- **Lambda-friendly** - stateless, fast cold start
- **Git-friendly storage** - files committable to repo
- **Pluggable** storage, embedders, and LLMs

## Why FlowRAG?

| | LightRAG | FlowRAG |
|---|----------|---------|
| Language | Python | TypeScript |
| Model | Server (always running) | Library (import and use) |
| Indexing | Continuous | Batch |
| Deploy | Container | Lambda-friendly |
| Storage | External DBs | File-based |

## Use Cases

**Local Development**:
```bash
flowrag index ./content    # Index your docs
flowrag search "query"     # Search locally
# DB files committed to Git ✓
```

**AWS Lambda**:
```typescript
// Query Lambda - stateless, fast
const rag = await createFlowRAG({ storage: s3Storage });
const results = await rag.search(query);
```

## Quick Start

```typescript
import { createFlowRAG, defineSchema } from '@flowrag/core';
import { createLocalStorage } from '@flowrag/presets';

// Define your schema
const schema = defineSchema({
  entityTypes: ['SERVICE', 'DATABASE', 'PROTOCOL'],
  relationTypes: ['USES', 'PRODUCES', 'CONSUMES'],
});

// Create RAG instance
const rag = await createFlowRAG({
  schema,
  ...createLocalStorage('./data'),
});

// Index documents
await rag.index('./content');

// Search
const results = await rag.search('how does authentication work');
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         FlowRAG                             │
├─────────────────────────────────────────────────────────────┤
│  Schema Definition  │  Pipeline  │  Graph Traversal         │
├─────────────────────┴────────────┴──────────────────────────┤
│                      STORAGE LAYER                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │    KV    │  │  Vector  │  │  Graph   │                   │
│  │  (JSON)  │  │ (LanceDB)│  │ (SQLite) │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
├─────────────────────────────────────────────────────────────┤
│                      PROVIDERS                              │
│  Embedder: Local ONNX │ Gemini                              │
│  Extractor: Gemini │ Bedrock                                │
└─────────────────────────────────────────────────────────────┘
```

## Packages

| Package | Description | Status |
|---------|-------------|--------|
| `@flowrag/core` | Interfaces, schema, pipeline | 🚧 Planned |
| `@flowrag/storage-json` | JSON file KV storage | 🚧 Planned |
| `@flowrag/storage-lancedb` | LanceDB vector storage | 🚧 Planned |
| `@flowrag/storage-sqlite` | SQLite graph storage | 🚧 Planned |
| `@flowrag/embedder-local` | HuggingFace ONNX | 🚧 Planned |
| `@flowrag/embedder-gemini` | Gemini embedding API | 🚧 Planned |
| `@flowrag/llm-gemini` | Gemini entity extraction | 🚧 Planned |
| `@flowrag/cli` | Command-line interface | 🚧 Planned |

## Key Features

### Schema-Flexible

Define your own entity types, relation types, and custom fields:

```typescript
const schema = defineSchema({
  entityTypes: ['SERVICE', 'PROTOCOL', 'TEAM'],
  relationTypes: ['PRODUCES', 'CONSUMES', 'OWNS'],
  documentFields: {
    domain: { type: 'string', filterable: true },
  },
});
```

### Graph-First

Trace data flows through your system:

```typescript
// Where does this data come from?
const sources = await rag.traceDataFlow('dashboard-metric', 'upstream');

// Where does this data go?
const consumers = await rag.traceDataFlow('user-event', 'downstream');
```

### Dual Retrieval

Combines vector search with graph traversal:

1. **Vector search**: Find semantically similar chunks
2. **Graph expansion**: Follow entity relationships
3. **Merge & dedupe**: Combine results

## Documentation

- [Requirements](.kiro/specs/v1/requirements.md) - Full specification

## Development

```bash
npm install        # Install dependencies
npm run build      # Build all packages
npm test           # Run tests
npm run lint       # Lint code
```

## License

MIT

---

*Inspired by [LightRAG](https://github.com/HKUDS/LightRAG), built for TypeScript developers.*
