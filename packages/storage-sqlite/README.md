# @flowrag/storage-sqlite

Graph storage implementation using SQLite. Embedded, fast, versionable.

## Installation

```bash
npm install @flowrag/storage-sqlite
```

## Usage

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

## License

MIT
