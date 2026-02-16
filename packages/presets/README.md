# @flowrag/presets

Opinionated presets for FlowRAG to get started quickly.

## Installation

```bash
npm install @flowrag/presets
```

## Usage

### Local Development

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

### Custom Path

```typescript
const rag = await createFlowRAG({
  schema,
  ...createLocalStorage({ path: './my-data' }),
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

`createLocalStorage()` provides:

- **KV Storage**: JSON files (`./data/kv/`)
- **Vector Storage**: LanceDB (`./data/vectors/`)
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
