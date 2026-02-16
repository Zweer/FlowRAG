# @flowrag/core

Interfaces, schema definition, and types for FlowRAG.

## Installation

```bash
npm install @flowrag/core
```

## Usage

### Schema Definition

```typescript
import { defineSchema } from '@flowrag/core';

const schema = defineSchema({
  entityTypes: ['SERVICE', 'DATABASE', 'PROTOCOL'],
  relationTypes: ['USES', 'PRODUCES', 'CONSUMES'],
});

schema.isValidEntityType('SERVICE');     // true
schema.normalizeEntityType('UNKNOWN');   // 'Other'
```

### Custom Fields

```typescript
const schema = defineSchema({
  entityTypes: ['SERVICE', 'DATABASE'],
  relationTypes: ['USES', 'PRODUCES'],
  entityFields: {
    status: { type: 'enum', values: ['active', 'deprecated'], default: 'active' },
  },
  relationFields: {
    syncType: { type: 'enum', values: ['sync', 'async'] },
  },
});
```

## Interfaces

- `KVStorage` — key-value storage (documents, chunks, cache)
- `VectorStorage` — vector embeddings for semantic search
- `GraphStorage` — knowledge graph (entities, relations, traversal)
- `Embedder` — text to vector embeddings
- `LLMExtractor` — entity/relation extraction via LLM
- `Reranker` — post-retrieval result reranking

## License

MIT
