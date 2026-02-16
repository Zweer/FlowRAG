# @flowrag/pipeline

Indexing and querying pipelines for FlowRAG with dual retrieval (vector + graph).

## Installation

```bash
npm install @flowrag/pipeline
```

## Usage

```typescript
import { createFlowRAG } from '@flowrag/pipeline';
import { createLocalStorage } from '@flowrag/presets';
import { defineSchema } from '@flowrag/core';

const schema = defineSchema({
  entityTypes: ['SERVICE', 'DATABASE'],
  relationTypes: ['USES', 'PRODUCES'],
});

const rag = createFlowRAG({ schema, ...createLocalStorage('./data') });

// Index documents
await rag.index('./content');

// Search with dual retrieval
const results = await rag.search('how does auth work');

// Trace data flow
const flow = await rag.traceDataFlow('auth-service', 'downstream');

// Statistics
const stats = await rag.stats();
```

## Query Modes

- `hybrid` — vector + graph combined (default)
- `local` — focus on specific entities found in query
- `global` — high-level concepts enriched with graph keywords
- `naive` — vector search only, no knowledge graph

## Indexing Pipeline

Files → Scanner → Chunker → Extractor (LLM) → Embedder → Storage

- Incremental indexing (SHA-256 content hashing)
- LLM extraction caching
- Configurable concurrency

## License

MIT
