# Multi-Tenancy

`withNamespace` wraps your storage with transparent namespace isolation, so multiple tenants can share the same backends without data collision.

## Setup

```typescript
import { withNamespace } from '@flowrag/core';
import { createFlowRAG } from '@flowrag/pipeline';

const storage = {
  kv: new JsonKVStorage({ path: './data/kv' }),
  vector: new LanceDBVectorStorage({ path: './data/vectors' }),
  graph: new SQLiteGraphStorage({ path: './data/graph.db' }),
};

const rag = createFlowRAG({
  schema,
  storage: withNamespace(storage, 'tenant-123'),
  embedder,
  extractor,
});
```

Each tenant gets its own isolated view of the same storage.

## How It Works

| Storage | Isolation Strategy |
|---------|-------------------|
| KV | Keys prefixed with `{namespace}:` |
| Vector | IDs prefixed, `__ns` metadata field added for filtered search |
| Graph | Entity and relation IDs prefixed (including sourceId, targetId, sourceChunkIds) |

All prefixing/unprefixing is transparent — your application code sees clean IDs without the namespace prefix.

## Example: Per-Tenant RAG

```typescript
async function createTenantRAG(tenantId: string) {
  return createFlowRAG({
    schema,
    storage: withNamespace(sharedStorage, tenantId),
    embedder,
    extractor,
  });
}

const ragA = await createTenantRAG('acme-corp');
const ragB = await createTenantRAG('globex');

// Each tenant's data is fully isolated
await ragA.index('./acme-docs');
await ragB.index('./globex-docs');

await ragA.search('payments'); // Only searches acme-corp data
```

## Migrating from Single-Tenant

If you started without namespacing, you don't need to re-index. Namespaced and non-namespaced data coexist in the same storage — like `export default` and named exports in TypeScript:

```typescript
// Your existing setup — data stored with bare keys (the "default" tenant)
const rag = createFlowRAG({ schema, storage, embedder, extractor });

// Add new tenants alongside — data stored with prefixed keys
const ragA = createFlowRAG({ schema, storage: withNamespace(storage, 'acme'), embedder, extractor });
const ragB = createFlowRAG({ schema, storage: withNamespace(storage, 'globex'), embedder, extractor });
```

The data doesn't collide:
- KV: `doc:readme` (default) vs `acme:doc:readme` vs `globex:doc:readme`
- Graph: `auth-service` vs `acme:auth-service`
- Vector: records without `__ns` (default) vs with `__ns: 'acme'`

::: warning
The bare (non-namespaced) tenant doesn't filter vector search by `__ns`, so it may return results from namespaced tenants too. If you need strict isolation for all tenants, wrap the original one as well:

```typescript
const ragDefault = createFlowRAG({
  schema,
  storage: withNamespace(storage, 'default'),
  embedder,
  extractor,
});
```

This requires a one-time re-index for the original data.
:::

## Limitations

- `vector.count()` returns the total count across all namespaces (the underlying storage has no per-namespace count)
- `graph.getEntities()` with filters does post-filtering by namespace, which may be slower on very large shared graphs

::: tip
For high-traffic multi-tenant deployments, consider using separate storage instances per tenant instead of shared storage with namespacing.
:::
