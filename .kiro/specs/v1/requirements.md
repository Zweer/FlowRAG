# FlowRAG v1 Requirements

> Complete specification for FlowRAG - a TypeScript RAG library with knowledge graph support.

## 1. Project Overview

### 1.1 What is FlowRAG?

FlowRAG is a **TypeScript RAG (Retrieval-Augmented Generation) library** designed for:
- Batch document indexing
- Stateless querying
- Knowledge graph construction and traversal
- Lambda/serverless deployment

### 1.2 Why FlowRAG? (vs LightRAG)

| Aspect | LightRAG | FlowRAG |
|--------|----------|---------|
| Language | Python | TypeScript |
| Model | Server (always running) | Library (import and use) |
| Indexing | Continuous, real-time | Batch, scheduled |
| Deploy | Container/server | Lambda-friendly |
| Storage | External DBs (Neo4j, Postgres) | File-based (Git-friendly) |
| Complexity | Feature-rich, many deps | Minimal, focused |

### 1.3 Target Use Cases

**Local Development** (e.g., echoes storytelling project):
- Index content via CLI
- DB files committed to Git repo
- Query via CLI
- Zero external services

**Cloud/Enterprise** (e.g., company documentation bot):
- Daily batch indexing via Lambda
- Store index on S3 or OpenSearch
- Query Lambda responds to bot requests
- No always-on containers

## 2. Architecture

### 2.1 Design Principles

1. **Library, not server**: No Docker, no processes to manage
2. **Batch-first**: Optimize for "index once, query many"
3. **Stateless queries**: Load index → query → done
4. **Storage-agnostic**: Pluggable backends via interfaces
5. **Schema-flexible**: User defines entity/relation types with fallback to `Other`
6. **Knowledge Graph is core**: The KG differentiates FlowRAG from simple vector search

### 2.2 Storage Types

Inspired by LightRAG's clean separation:

| Storage | Purpose | Interface |
|---------|---------|-----------|
| **KV** | Documents, chunks, LLM cache | `get`, `set`, `delete`, `list` |
| **Vector** | Embeddings for semantic search | `upsert`, `search`, `delete` |
| **Graph** | Entities and relations | `addEntity`, `addRelation`, `traverse`, `findPath` |

### 2.3 Storage Implementations

**Local (default)**:
- KV: JSON files
- Vector: LanceDB
- Graph: SQLite

**Cloud**:
- KV: S3
- Vector: OpenSearch
- Graph: OpenSearch
- LLM: AWS Bedrock

### 2.4 Monorepo Structure

```
flowrag/
├── package.json              # npm workspaces root
├── tsconfig.json             # Shared TypeScript config
├── tsdown.config.ts          # Build config (workspace mode)
├── biome.json                # Linting & formatting
├── vitest.config.ts          # Test config
├── packages/
│   ├── core/                 # Interfaces, schema, types
│   │   ├── src/
│   │   │   ├── index.ts      # Public exports
│   │   │   ├── types.ts      # Core types
│   │   │   ├── schema.ts     # defineSchema(), Zod-based
│   │   │   └── interfaces/   # Storage, Embedder, LLM interfaces
│   │   ├── test/
│   │   └── package.json
│   │
│   ├── pipeline/             # Indexing & querying pipelines
│   ├── presets/              # Opinionated presets (createLocalStorage)
│   │
│   ├── storage-json/         # JSON file KV storage
│   ├── storage-sqlite/       # SQLite for Graph
│   ├── storage-lancedb/      # LanceDB for Vectors
│   ├── storage-s3/           # S3 adapter
│   ├── storage-opensearch/   # OpenSearch adapter
│   │
│   ├── provider-local/       # Local AI provider (ONNX embeddings)
│   ├── provider-gemini/      # Gemini AI provider (embeddings + extraction)
│   ├── provider-bedrock/     # AWS Bedrock provider
│   │
│   └── cli/                  # CLI for local usage (planned)
│
├── examples/
│   ├── local-docs/           # Local documentation example
│   └── lambda-query/         # AWS Lambda example
│
└── docs/                     # Additional documentation
```

## 3. Core Interfaces

### 3.1 Schema Definition

Users define their schema at initialization. The schema is **flexible**: if the LLM extracts an entity type not in the list, it falls back to `Other`.

```typescript
import { defineSchema } from '@flowrag/core';

const schema = defineSchema({
  // Entity types for this domain (suggestions, not strict)
  entityTypes: ['SERVICE', 'PROTOCOL', 'DATABASE', 'TEAM'] as const,
  
  // Relation types
  relationTypes: ['PRODUCES', 'CONSUMES', 'OWNS', 'DEPENDS_ON'] as const,
});
```

**Custom fields** for richer metadata:

```typescript
const schema = defineSchema({
  entityTypes: ['SERVICE', 'PROTOCOL', 'DATABASE', 'TEAM'] as const,
  relationTypes: ['PRODUCES', 'CONSUMES', 'OWNS', 'DEPENDS_ON'] as const,
  
  // Custom fields for documents - enables filtering by domain/system
  documentFields: {
    domain: { type: 'string', filterable: true },   // "payments", "auth", "ocpp"
    system: { type: 'string', filterable: true },   // "becky", "aldo"
    version: { type: 'string', filterable: false },
  },
  
  // Custom fields for entities - track status and ownership
  entityFields: {
    status: { type: 'enum', values: ['active', 'deprecated'], default: 'active' },
    owner: { type: 'string' },  // "team-payments"
  },
  
  // Custom fields for relations - understand HOW services communicate
  relationFields: {
    dataFormat: { type: 'string' },                    // "JSON", "Protobuf"
    syncType: { type: 'enum', values: ['sync', 'async'] },
  },
});
```

### 3.2 Storage Interfaces

```typescript
// KV Storage
interface KVStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
  clear(): Promise<void>;
}

// Vector Storage
interface VectorStorage {
  upsert(records: VectorRecord[]): Promise<void>;
  search(vector: number[], limit: number, filter?: Filter): Promise<SearchResult[]>;
  delete(ids: string[]): Promise<void>;
  count(): Promise<number>;
}

// Graph Storage
interface GraphStorage {
  addEntity(entity: Entity): Promise<void>;
  addRelation(relation: Relation): Promise<void>;
  getEntity(id: string): Promise<Entity | null>;
  getEntities(filter?: EntityFilter): Promise<Entity[]>;
  getRelations(entityId: string, direction?: 'in' | 'out' | 'both'): Promise<Relation[]>;
  traverse(startId: string, depth: number, relationTypes?: string[]): Promise<Entity[]>;
  findPath(fromId: string, toId: string, maxDepth?: number): Promise<Relation[]>;
  deleteEntity(id: string): Promise<void>;
  deleteRelation(id: string): Promise<void>;
}
```

### 3.3 Embedder Interface

```typescript
interface Embedder {
  readonly dimensions: number;
  readonly modelName: string;
  
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}
```

### 3.4 LLM Interface (for entity extraction)

```typescript
interface LLMExtractor {
  extractEntities(
    content: string,
    knownEntities: string[],
    schema: Schema
  ): Promise<ExtractionResult>;
}

interface ExtractionResult {
  entities: ExtractedEntity[];
  relations: ExtractedRelation[];
}

interface ExtractedEntity {
  name: string;
  type: string;  // from schema.entityTypes, or "Other" if not matching
  description: string;
}

interface ExtractedRelation {
  source: string;
  target: string;
  type: string;  // from schema.relationTypes
  description: string;
  keywords: string[];  // high-level keywords for the relation
}
```

### 3.5 Reranker Interface

```typescript
interface Reranker {
  rerank(query: string, documents: RerankDocument[], limit?: number): Promise<RerankResult[]>;
}

interface RerankDocument {
  id: string;
  content: string;
  score: number;
}

interface RerankResult {
  id: string;
  score: number;
  index: number;
}
```

## 4. Pipeline

### 4.1 Indexing Pipeline

```
Input Documents
      │
      ▼
┌─────────────┐
│   Scanner   │  Parse files, extract metadata
└─────────────┘
      │
      ▼
┌─────────────┐
│   Chunker   │  Split into chunks (token-based, ~1200 tokens, 100 overlap)
└─────────────┘
      │
      ▼
┌─────────────┐
│  Extractor  │  LLM extracts entities + relations
└─────────────┘
      │
      ▼
┌─────────────┐
│  Embedder   │  Generate embeddings
└─────────────┘
      │
      ▼
┌─────────────┐
│   Storage   │  Save to KV + Vector + Graph
└─────────────┘
```

**Chunking Strategy** (inspired by LightRAG):
- Token-based chunking with `chunkSize: 1200` tokens
- Overlap of `100` tokens between chunks
- Uses tiktoken for tokenization

**LLM Caching**:
- Entity extraction responses are cached in KV storage
- Avoids re-processing identical chunks
- Cache key: hash of chunk content

**Concurrency Control**:
- `maxParallelInsert`: max documents processed concurrently (default: 2)
- `llmMaxAsync`: max concurrent LLM calls (default: 4)
- `embeddingMaxAsync`: max concurrent embedding calls (default: 16)

**Incremental Indexing**:
- Each document's content is hashed (SHA-256) after processing
- Hash stored in KV as `docHash:{documentId}`
- On re-index, unchanged documents are skipped automatically
- Use `force: true` to re-process all documents regardless of hash

### 4.2 Query Pipeline

```
User Query
      │
      ▼
┌─────────────┐
│  Embedder   │  Embed query
└─────────────┘
      │
      ▼
┌─────────────────────────────────┐
│        Dual Retrieval           │
│  ┌───────────┐  ┌────────────┐  │
│  │  Vector   │  │   Graph    │  │
│  │  Search   │  │  Traverse  │  │
│  └───────────┘  └────────────┘  │
└─────────────────────────────────┘
      │
      ▼
┌─────────────┐
│   Merger    │  Combine + dedupe results
└─────────────┘
      │
      ▼
Results (chunks + entities + relations)
```

**Query Modes** (inspired by LightRAG):
- `local`: Focus on specific entities found in query
- `global`: Use high-level concepts and themes
- `hybrid`: Combine local and global (default)
- `naive`: Simple vector search only (no KG)

### 4.3 Graph Traversal for Data Flow

Key feature for technical documentation:

```typescript
// Trace data flow downstream
const flow = await rag.traceDataFlow('charging-session', 'downstream');
// Result: ChargingStation → OCPP Backend → Kafka → Analytics → Dashboard

// Trace data flow upstream
const sources = await rag.traceDataFlow('dashboard-metric', 'upstream');
// Result: Dashboard ← Analytics ← Kafka ← Multiple Services

// Find path between two entities
const path = await rag.findPath('ServiceA', 'ServiceB');
// Result: ServiceA → Kafka → ServiceB
```

## 5. Configuration

### 5.1 FlowRAG Instance

```typescript
import { defineSchema } from '@flowrag/core';
import { createFlowRAG } from '@flowrag/pipeline';
import { JsonKVStorage } from '@flowrag/storage-json';
import { LanceDBVectorStorage } from '@flowrag/storage-lancedb';
import { SQLiteGraphStorage } from '@flowrag/storage-sqlite';
import { LocalEmbedder } from '@flowrag/provider-local';
import { GeminiExtractor } from '@flowrag/provider-gemini';

const rag = createFlowRAG({
  schema,
  storage: {
    kv: new JsonKVStorage({ path: './data/kv' }),
    vector: new LanceDBVectorStorage({ path: './data/vectors' }),
    graph: new SQLiteGraphStorage({ path: './data/graph.db' }),
  },
  embedder: new LocalEmbedder({ model: 'Xenova/e5-small-v2' }),
  extractor: new GeminiExtractor({ model: 'gemini-2.5-flash' }),
});
```

### 5.2 Environment Variables

```bash
# Embedder (local)
FLOWRAG_EMBEDDING_MODEL=Xenova/e5-small-v2
FLOWRAG_EMBEDDING_DTYPE=q8  # fp32, q8, q4

# Embedder (Gemini)
GEMINI_API_KEY=your-key

# LLM Extractor
FLOWRAG_EXTRACTOR_MODEL=gemini-2.5-flash

# AWS (for cloud storage)
AWS_REGION=eu-central-1
```

## 6. CLI

### 6.1 Commands

```bash
# Initialize project
flowrag init

# Index documents
flowrag index ./content
flowrag index ./content --force  # Re-index all

# Search
flowrag search "how does OCPP work"
flowrag search "OCPP" --type entities
flowrag search "ServiceA" --type relations

# Graph operations
flowrag graph export --format dot
flowrag graph stats

# Database info
flowrag stats
```

### 6.2 Human-in-the-Loop (Local Only)

During indexing, new entities can be reviewed:

```
📄 Processing: becky-ocpp16/README.md

🔍 New entities found:

  1. [SERVICE] becky-ocpp16
     "Backend OCPP 1.6 per comunicazione con colonnine"

  2. [PROTOCOL] OCPP 1.6
     "Open Charge Point Protocol versione 1.6"

? Accept all entities? (Y/n/edit)
```

## 7. Deployment Patterns

### 7.1 Local Development

```typescript
// index.ts
import { createFlowRAG } from '@flowrag/pipeline';
import { createLocalStorage } from '@flowrag/presets';

const rag = createFlowRAG({
  schema,
  ...createLocalStorage('./data'),
});

// Index
await rag.index('./content');

// Query
const results = await rag.search('how does authentication work');
```

### 7.2 AWS Lambda

```typescript
// query-lambda.ts
import { defineSchema } from '@flowrag/core';
import { createFlowRAG } from '@flowrag/pipeline';
import { BedrockEmbedder, BedrockExtractor } from '@flowrag/provider-bedrock';
import { S3KVStorage } from '@flowrag/storage-s3';
import { OpenSearchVectorStorage, OpenSearchGraphStorage } from '@flowrag/storage-opensearch';

export const handler = async (event: { query: string }) => {
  const rag = createFlowRAG({
    schema,
    storage: {
      kv: new S3KVStorage({ client: s3Client, bucket: 'my-rag-bucket', prefix: 'kv/' }),
      vector: new OpenSearchVectorStorage({ client: osClient, dimensions: 1024 }),
      graph: new OpenSearchGraphStorage({ client: osClient }),
    },
    embedder: new BedrockEmbedder(),
    extractor: new BedrockExtractor(),
  });

  return await rag.search(event.query);
};
```

## 8. Tech Stack

| Purpose | Tool |
|---------|------|
| Runtime | Node.js >=20 |
| Language | TypeScript (strict mode, isolatedDeclarations) |
| Package Manager | npm workspaces |
| Build | tsdown (Rolldown-based) |
| Vector DB | LanceDB, OpenSearch |
| Graph DB | SQLite, OpenSearch |
| KV Storage | JSON files, S3 |
| Embeddings | @huggingface/transformers (ONNX), Gemini, AWS Bedrock |
| Entity Extraction | Gemini AI, AWS Bedrock |
| Testing | Vitest |
| Linting/Formatting | Biome |
| Schema Validation | Zod |

## 9. Development Phases

### Phase 1: Core Foundation ✅ **Complete**
- [x] Monorepo setup (npm workspaces)
- [x] Build tooling (tsdown, Biome, Vitest)
- [x] `@flowrag/core`: types, interfaces, schema definition
- [x] Basic tests for schema
- [x] `@flowrag/storage-json`: JSON file KV storage
- [x] `@flowrag/storage-lancedb`: LanceDB vector storage
- [x] `@flowrag/storage-sqlite`: SQLite graph storage
- [x] Tests for all storage packages

### Phase 2: Providers ✅ **Complete**
- [x] `@flowrag/provider-local`: HuggingFace ONNX embeddings
- [x] `@flowrag/provider-gemini`: Gemini embeddings + entity extraction
- [x] Integration tests
- [x] Package restructuring (embedder-*/llm-* → provider-*)

### Phase 3: Pipeline ✅ **Complete**
- [x] `@flowrag/pipeline`: Indexing pipeline (scanner, chunker, extractor, embedder, storage)
- [x] `@flowrag/pipeline`: Query pipeline with dual retrieval (vector + graph)
- [x] `@flowrag/presets`: Opinionated local storage preset
- [x] 100% test coverage (160 tests)

### Phase 4: CLI ✅ **Complete**
- [x] `@flowrag/cli`: Command-line interface (init, index, search, stats, graph)
- [x] Human-in-the-loop for local indexing (`--interactive` with @inquirer/prompts)
- [x] Pipeline hooks (`onEntitiesExtracted` callback)
- [x] 100% test coverage (210 tests)

### Phase 5: Cloud Storage ✅ **Complete**
- [x] `@flowrag/storage-s3`: S3 adapter
- [x] `@flowrag/storage-opensearch`: OpenSearch adapter
- [x] `@flowrag/provider-bedrock`: AWS Bedrock
- [x] Lambda examples

### Phase 6: Advanced Features ✅ **Complete**
- [x] Reranker support
- [x] Custom fields (documentFields, entityFields, relationFields)
- [x] Incremental indexing with document status tracking

## 10. Non-Goals (Out of Scope for v1)

- **Real-time indexing**: We optimize for batch
- **Built-in server**: Use as library, not service
- **Python support**: TypeScript only
- **Neo4j integration**: SQLite/OpenSearch sufficient for our scale
- **Multi-tenancy**: Single workspace per instance
- **MCP server**: Not in v1

## 11. Success Criteria

1. **Local use case**: Index 500 docs, query in <100ms, DB <50MB
2. **Developer experience**: `npm install` + 10 lines of code to get started
3. **Test coverage**: >90% on core packages
4. **Documentation**: README + examples for each package

---

*Last updated: 2026-02-13*
*Version: 1.0*
