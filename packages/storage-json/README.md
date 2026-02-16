# @flowrag/storage-json

KV storage implementation using JSON files on disk. Git-friendly, human-readable.

## Installation

```bash
npm install @flowrag/storage-json
```

## Usage

```typescript
import { JsonKVStorage } from '@flowrag/storage-json';

const kv = new JsonKVStorage({ path: './data/kv' });

await kv.set('doc:readme', { content: 'Hello world' });
const doc = await kv.get('doc:readme');
const keys = await kv.list('doc:');
await kv.delete('doc:readme');
await kv.clear();
```

## Storage Layout

```
data/kv/
├── doc:readme.json
├── chunk:readme:0.json
├── extraction:a1b2c3.json    # LLM cache
└── docHash:doc:readme.json   # Incremental indexing
```

## License

MIT
