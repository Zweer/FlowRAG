# @flowrag/storage-redis

Redis storage for FlowRAG — KV and vector storage on Redis Stack.

## Installation

```bash
npm install @flowrag/storage-redis redis
```

Requires [Redis Stack](https://redis.io/docs/getting-started/install-stack/) for vector storage.

## Usage

### KV Storage

```typescript
import { createClient } from 'redis';
import { RedisKVStorage } from '@flowrag/storage-redis';

const client = createClient({ url: 'redis://localhost:6379' });
await client.connect();

const kv = new RedisKVStorage({ client });
```

### Vector Storage

```typescript
import { RedisVectorStorage } from '@flowrag/storage-redis';

const vector = new RedisVectorStorage({ client, dimensions: 384 });
```

### Preset

```typescript
import { createRedisStorage } from '@flowrag/storage-redis';

const { kv, vector } = await createRedisStorage({
  url: 'redis://localhost:6379',
  dimensions: 384,
});
```

## License

MIT
