# FlowRAG 🌊

[![CI](https://github.com/Zweer/FlowRAG/actions/workflows/npm.yml/badge.svg)](https://github.com/Zweer/FlowRAG/actions/workflows/npm.yml)
[![Security](https://github.com/Zweer/FlowRAG/actions/workflows/security.yml/badge.svg)](https://github.com/Zweer/FlowRAG/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Coverage Badge](https://img.shields.io/badge/coverage-100%25-brightgreen?style=flat)

TypeScript RAG library with knowledge graph support.

## Table of Contents

- [Why FlowRAG?](#why-flowrag)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Features](#features)
- [Architecture](#architecture)
- [Packages](#packages)
- [Use Cases](#use-cases)
- [Development](#development)
- [Comparison](#comparison)
- [License](#license)

## Why FlowRAG?

FlowRAG solves common problems with existing RAG solutions:

**🐍 Python Complexity**: No Python environments, virtual envs, or dependency conflicts. Pure TypeScript.

**🖥️ Always-On Servers**: Works as a library, not a service. Import, use, done.

**☁️ Serverless Unfriendly**: Optimized for Lambda with fast cold starts and stateless queries.

**📁 Storage Lock-in**: File-based storage that's Git-friendly. Commit your knowledge base.

**🔗 Missing Knowledge Graphs**: Combines vector search with entity relationships for richer context.

**🔧 Complex Setup**: `npm install` and 10 lines of code to get started.

## Installation

```bash
npm install @flowrag/core @flowrag/storage-json @flowrag/storage-sqlite @flowrag/storage-lancedb
npm install @flowrag/provider-local @flowrag/provider-gemini
```

Or for a complete local setup:
```bash
npm install @flowrag/core @flowrag/presets
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

## Features

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
| [`@flowrag/core`](./packages/core) | [![npm version](https://badge.fury.io/js/%40flowrag%2Fcore.svg)](https://www.npmjs.com/package/@flowrag/core) | Interfaces, schema, types | ✅ Complete |
| [`@flowrag/pipeline`](./packages/pipeline) | [![npm version](https://badge.fury.io/js/%40flowrag%2Fpipeline.svg)](https://www.npmjs.com/package/@flowrag/pipeline) | Indexing & querying pipelines | ✅ Complete |
| [`@flowrag/storage-json`](./packages/storage-json) | [![npm version](https://badge.fury.io/js/%40flowrag%2Fstorage-json.svg)](https://www.npmjs.com/package/@flowrag/storage-json) | JSON file KV storage | ✅ Complete |
| [`@flowrag/storage-sqlite`](./packages/storage-sqlite) | [![npm version](https://badge.fury.io/js/%40flowrag%2Fstorage-sqlite.svg)](https://www.npmjs.com/package/@flowrag/storage-sqlite) | SQLite graph storage | ✅ Complete |
| [`@flowrag/storage-lancedb`](./packages/storage-lancedb) | [![npm version](https://badge.fury.io/js/%40flowrag%2Fstorage-lancedb.svg)](https://www.npmjs.com/package/@flowrag/storage-lancedb) | LanceDB vector storage | ✅ Complete |
| [`@flowrag/provider-local`](./packages/provider-local) | [![npm version](https://badge.fury.io/js/%40flowrag%2Fprovider-local.svg)](https://www.npmjs.com/package/@flowrag/provider-local) | Local AI provider (ONNX embeddings) | ✅ Complete |
| [`@flowrag/provider-gemini`](./packages/provider-gemini) | [![npm version](https://badge.fury.io/js/%40flowrag%2Fprovider-gemini.svg)](https://www.npmjs.com/package/@flowrag/provider-gemini) | Gemini AI provider (embeddings + extraction) | ✅ Complete |
| [`@flowrag/presets`](./packages/presets) | [![npm version](https://badge.fury.io/js/%40flowrag%2Fpresets.svg)](https://www.npmjs.com/package/@flowrag/presets) | Opinionated presets | ✅ Complete |
| `@flowrag/cli` | ![npm](https://img.shields.io/badge/v0.0.0-gray) | Command-line interface | 📋 Planned |

### Development Status
- **✅ Complete**: Fully implemented with 100% test coverage
- **🚧 In Progress**: Currently being developed  
- **📋 Planned**: Scheduled for future development

## Use Cases

### Local Development

```bash
flowrag index ./content    # Index your docs
flowrag search "query"     # Search locally
# DB files committed to Git ✓
```

### AWS Lambda

```typescript
// Query Lambda - stateless, fast
const rag = await createFlowRAG({ storage: s3Storage });
const results = await rag.search(query);
```

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

## Comparison

### FlowRAG vs LightRAG

| Aspect | LightRAG | FlowRAG |
|--------|----------|---------|
| Language | Python | TypeScript |
| Model | Server (always running) | Library (import and use) |
| Indexing | Continuous, real-time | Batch, scheduled |
| Deploy | Container/server | Lambda-friendly |
| Storage | External DBs (Neo4j, Postgres) | File-based (Git-friendly) |
| Complexity | Feature-rich, many deps | Minimal, focused |

## License

MIT

---

*Inspired by [LightRAG](https://github.com/HKUDS/LightRAG), built for TypeScript developers.*
