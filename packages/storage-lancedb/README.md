# @flowrag/storage-lancedb

Vector storage implementation using LanceDB. Embedded, no server required.

## Installation

```bash
npm install @flowrag/storage-lancedb
```

## Usage

```typescript
import { LanceDBVectorStorage } from '@flowrag/storage-lancedb';

const vector = new LanceDBVectorStorage({
  path: './data/vectors',
  dimensions: 384,
});

await vector.upsert([{ id: 'chunk:1', vector: [0.1, 0.2, ...], metadata: {} }]);
const results = await vector.search([0.1, 0.2, ...], 10);
const count = await vector.count();
```

## License

MIT
