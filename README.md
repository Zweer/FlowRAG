# FlowRAG 🌊

[![CI](https://github.com/Zweer/FlowRAG/actions/workflows/ci.yml/badge.svg)](https://github.com/Zweer/FlowRAG/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Coverage Badge](https://img.shields.io/badge/coverage-100%25-brightgreen?style=flat)

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

| Package | Version | Description | Status |
|---------|---------|-------------|--------|
| [`@flowrag/core`](./packages/core) | ![npm](https://img.shields.io/badge/v0.0.0-blue) | Interfaces, schema, types | ✅ Complete |
| [`@flowrag/storage-json`](./packages/storage-json) | ![npm](https://img.shields.io/badge/v0.0.0-blue) | JSON file KV storage | ✅ Complete |
| [`@flowrag/storage-sqlite`](./packages/storage-sqlite) | ![npm](https://img.shields.io/badge/v0.0.0-blue) | SQLite graph storage | ✅ Complete |
| [`@flowrag/storage-lancedb`](./packages/storage-lancedb) | ![npm](https://img.shields.io/badge/v0.0.0-blue) | LanceDB vector storage | ✅ Complete |
| `@flowrag/embedder-local` | ![npm](https://img.shields.io/badge/v0.0.0-gray) | HuggingFace ONNX | 📋 Planned |
| `@flowrag/embedder-gemini` | ![npm](https://img.shields.io/badge/v0.0.0-gray) | Gemini embedding API | 📋 Planned |
| `@flowrag/llm-gemini` | ![npm](https://img.shields.io/badge/v0.0.0-gray) | Gemini entity extraction | 📋 Planned |
| `@flowrag/cli` | ![npm](https://img.shields.io/badge/v0.0.0-gray) | Command-line interface | 📋 Planned |

### Development Status
- **✅ Complete**: Fully implemented with 100% test coverage
- **🚧 In Progress**: Currently being developed  
- **📋 Planned**: Scheduled for future development

## Key Features

### Schema-Flexible

Define your own entity and relation types. Unknown types fallback to `Other`:

```typescript
const schema = defineSchema({
  entityTypes: ['SERVICE', 'PROTOCOL', 'TEAM'],
  relationTypes: ['PRODUCES', 'CONSUMES', 'OWNS'],
});

// schema.isValidEntityType('SERVICE') → true
// schema.normalizeEntityType('UNKNOWN') → 'Other'
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

## Tech Stack

| Purpose | Tool |
|---------|------|
| Runtime | Node.js >=20 |
| Language | TypeScript (strict, isolatedDeclarations) |
| Build | tsdown (Rolldown-based) |
| Test | Vitest |
| Lint/Format | Biome |
| Schema | Zod |

## Development

```bash
npm install        # Install dependencies
npm run build      # Build all packages
npm test           # Run tests
npm run lint       # Lint code
npm run typecheck  # Type check
```

## Documentation

- [Requirements](.kiro/specs/v1/requirements.md) - Full specification

## License

MIT

---

*Inspired by [LightRAG](https://github.com/HKUDS/LightRAG), built for TypeScript developers.*
