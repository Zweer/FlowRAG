# @flowrag/presets

Opinionated presets for FlowRAG to get started quickly.

## Installation

```bash
npm install @flowrag/presets
```

## Usage

### Local Development (LanceDB)

```typescript
import { createFlowRAG, defineSchema } from '@flowrag/core';
import { createLocalStorage } from '@flowrag/presets';

const schema = defineSchema({
  entityTypes: ['SERVICE', 'DATABASE'],
  relationTypes: ['USES', 'PRODUCES'],
});

const rag = await createFlowRAG({
  schema,
  ...createLocalStorage(), // Uses './data' by default
});
```

### Local Development (SQLite — lightweight)

```typescript
import { createSQLiteStorage } from '@flowrag/presets';

const rag = await createFlowRAG({
  schema,
  ...createSQLiteStorage('./data'),
});
```

Uses sqlite-vec for vector search instead of LanceDB — smaller native binaries (~2MB vs ~50MB).

### Custom Path

```typescript
const rag = await createFlowRAG({
  schema,
  ...createLocalStorage('./my-data'),
  // or: ...createLocalStorage({ path: './my-data' }),
});
```

### Override Components

```typescript
import { GeminiEmbedder } from '@flowrag/provider-gemini';

const rag = await createFlowRAG({
  schema,
  ...createLocalStorage({
    path: './data',
    embedder: new GeminiEmbedder(), // Use Gemini instead of local ONNX
  }),
});
```

## What's Included

### `createLocalStorage()`

- **KV Storage**: JSON files (`./data/kv/`)
- **Vector Storage**: LanceDB (`./data/vectors/`)
- **Graph Storage**: SQLite (`./data/graph.db`)
- **Embedder**: Local ONNX (Xenova/e5-small-v2)
- **Extractor**: Gemini (gemini-3-flash-preview)

### `createSQLiteStorage()`

- **KV Storage**: JSON files (`./data/kv/`)
- **Vector Storage**: SQLite + sqlite-vec (`./data/vectors.db`)
- **Graph Storage**: SQLite (`./data/graph.db`)
- **Embedder**: Local ONNX (Xenova/e5-small-v2)
- **Extractor**: Gemini (gemini-3-flash-preview)

## API

### `createLocalStorage(options?)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `path` | `string` | `'./data'` | Base path for storage |
| `kv` | `KVStorage` | `JsonKVStorage` | Override KV storage |
| `vector` | `VectorStorage` | `LanceDBVectorStorage` | Override vector storage |
| `graph` | `GraphStorage` | `SQLiteGraphStorage` | Override graph storage |
| `embedder` | `Embedder` | `LocalEmbedder` | Override embedder |
| `extractor` | `LLMExtractor` | `GeminiExtractor` | Override extractor |

### `createSQLiteStorage(options?)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `path` | `string` | `'./data'` | Base path for storage |
| `dimensions` | `number` | `384` | Vector dimensions (must match embedder) |
| `kv` | `KVStorage` | `JsonKVStorage` | Override KV storage |
| `vector` | `VectorStorage` | `SQLiteVectorStorage` | Override vector storage |
| `graph` | `GraphStorage` | `SQLiteGraphStorage` | Override graph storage |
| `embedder` | `Embedder` | `LocalEmbedder` | Override embedder |
| `extractor` | `LLMExtractor` | `GeminiExtractor` | Override extractor |
