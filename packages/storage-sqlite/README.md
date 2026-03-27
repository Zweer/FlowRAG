# @flowrag/storage-sqlite

Graph and vector storage implementation using SQLite. Embedded, fast, versionable.

## Installation

```bash
npm install @flowrag/storage-sqlite
```

## Graph Storage

```typescript
import { SQLiteGraphStorage } from '@flowrag/storage-sqlite';

const graph = new SQLiteGraphStorage({ path: './data/graph.db' });

await graph.addEntity({ id: 'auth', name: 'Auth Service', type: 'SERVICE', description: '...', sourceChunkIds: [] });
await graph.addRelation({ id: 'r1', sourceId: 'auth', targetId: 'postgres', type: 'USES', description: '...', keywords: ['db'], sourceChunkIds: [] });

const entity = await graph.getEntity('auth');
const relations = await graph.getRelations('auth', 'out');
const path = await graph.findPath('auth', 'dashboard');
const neighbors = await graph.traverse('auth', 2);
```

## Vector Storage

Lightweight vector search via [sqlite-vec](https://github.com/asg017/sqlite-vec) — a pure-C SQLite extension with KNN support.

```typescript
import { SQLiteVectorStorage } from '@flowrag/storage-sqlite';

const vector = new SQLiteVectorStorage({
  path: './data/vectors.db',
  dimensions: 384, // must match your embedder
});

await vector.upsert([{ id: 'chunk-1', vector: [0.1, 0.2, ...], metadata: { _kind: 'chunk' } }]);
const results = await vector.search([0.1, 0.2, ...], 10, { _kind: 'chunk' });
```

This is a lightweight alternative to `@flowrag/storage-lancedb` — smaller native binaries (~2MB vs ~50MB), single `.db` file.

## License

MIT
