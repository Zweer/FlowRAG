# Redis Storage

`@flowrag/storage-redis` provides KV and vector storage on Redis Stack, combining fast key-value operations with vector similarity search via RediSearch.

## Installation

```bash
npm install @flowrag/storage-redis redis
```

## Configuration

```typescript
import { createClient } from 'redis';
import { RedisKVStorage, RedisVectorStorage } from '@flowrag/storage-redis';

const client = createClient({ url: 'redis://localhost:6379' });
await client.connect();

const kv = new RedisKVStorage({ client });
const vector = new RedisVectorStorage({ client, dimensions: 384 });
```

## KV Storage

Key-value storage for documents, chunks, and LLM cache.

```typescript
const kv = new RedisKVStorage({
  client,
  prefix: 'flowrag:kv:', // default
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `client` | `RedisClient` | — | Connected redis client (required) |
| `prefix` | `string` | `flowrag:kv:` | Key prefix for namespacing |

## Vector Storage

Vector similarity search using RediSearch (HNSW index, cosine distance).

```typescript
const vector = new RedisVectorStorage({
  client,
  dimensions: 384,
  index: 'flowrag-vectors', // default
  prefix: 'flowrag:vec:',   // default
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `client` | `RedisClient` | — | Connected redis client (required) |
| `dimensions` | `number` | — | Vector dimensions (required) |
| `index` | `string` | `flowrag-vectors` | RediSearch index name |
| `prefix` | `string` | `flowrag:vec:` | Hash key prefix |

The index is created automatically on first use with HNSW algorithm and COSINE distance metric.

::: warning
Requires [Redis Stack](https://redis.io/docs/getting-started/install-stack/) or a Redis instance with the RediSearch module for vector storage.
:::

## Full Example

```typescript
import { defineSchema } from '@flowrag/core';
import { createFlowRAG } from '@flowrag/pipeline';
import { createClient } from 'redis';
import { RedisKVStorage, RedisVectorStorage } from '@flowrag/storage-redis';
import { SQLiteGraphStorage } from '@flowrag/storage-sqlite';
import { LocalEmbedder } from '@flowrag/provider-local';
import { GeminiExtractor } from '@flowrag/provider-gemini';

const client = createClient({ url: 'redis://localhost:6379' });
await client.connect();

const rag = createFlowRAG({
  schema: defineSchema({
    entityTypes: ['SERVICE', 'DATABASE'],
    relationTypes: ['USES', 'PRODUCES'],
  }),
  storage: {
    kv: new RedisKVStorage({ client }),
    vector: new RedisVectorStorage({ client, dimensions: 384 }),
    graph: new SQLiteGraphStorage({ path: './data/graph.db' }),
  },
  embedder: new LocalEmbedder(),
  extractor: new GeminiExtractor(),
});
```
