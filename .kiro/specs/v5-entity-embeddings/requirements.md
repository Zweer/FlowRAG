# Entity Embeddings & Semantic Entity Search

> Embed entities in vector storage and expose semantic search on the knowledge graph.

## 1. Problem

Entities live only in GraphStorage as structured data. There's no way to semantically search them — users must either search chunks (returns document fragments, not entities) or do exact name matches via `graph.getEntities()`.

## 2. Goal

- Embed entities during indexing and store them in VectorStorage
- Expose `searchEntities()` for semantic entity search
- Keep entity vectors in sync across the full lifecycle (indexing, deletion, merge)

## 3. Design Decisions

### 3.1 Vector Record Discrimination (`_kind` field)

Adding entity vectors to the same VectorStorage as chunk vectors creates a pollution problem: existing searches would return entity vectors mixed with chunk results.

**Solution**: Add a `_kind` metadata field to ALL vector records:

| Record type | `_kind` value |
|-------------|---------------|
| Chunk | `'chunk'` |
| Entity | `'entity'` |

- `searchEntities()` filters by `{ _kind: 'entity' }`
- Existing chunk searches filter by `{ _kind: 'chunk' }`
- **Breaking change**: existing indexes need `force: true` re-index to add `_kind` to chunk records. Without re-index, chunk records lack `_kind` — chunk search should work without the filter as fallback (backward compat is NOT required, this is a minor version bump).

### 3.2 Embedding Text Format

```
[{type}] {name}: {description}
```

Example: `[SERVICE] Auth Service: Handles authentication and JWT token generation`

Including the type improves disambiguation between entities with similar descriptions.

### 3.3 Embedding Timing

Entity embedding happens as a **post-processing step** after all chunks are processed, because:
- The same entity can appear in multiple chunks, enriching its description
- `addEntity()` merges `sourceChunkIds` — the final entity state is only known after all chunks

### 3.4 Incremental Behavior

On re-index, ALL entities are re-embedded (not just changed ones). Entities are few compared to chunks, and tracking which entity descriptions changed across chunk updates adds complexity not worth the optimization.

## 4. Changes

### 4.1 `@flowrag/core` — Types

```typescript
// New interface
interface EntitySearchResult {
  entity: Entity;
  score: number;
}
```

### 4.2 `@flowrag/pipeline` — IndexingPipeline

1. **`processChunk()`**: Add `_kind: 'chunk'` to chunk vector metadata
2. **`process()`**: After all batches, embed all entities and upsert with `_kind: 'entity'`
3. **`deleteDocument()`**: When deleting orphaned entities, also delete `entity:{id}` from vector storage
4. **`mergeEntities()`**: Delete old entity vectors, embed and upsert merged entity vector

### 4.3 `@flowrag/pipeline` — QueryPipeline

1. **All existing searches** (`naiveSearch`, `localSearch`, `globalSearch`): Add `{ _kind: 'chunk' }` filter
2. **New `searchEntities()`**: Embed query, search with `{ _kind: 'entity' }` filter, hydrate from GraphStorage

### 4.4 `@flowrag/pipeline` — createFlowRAG

Expose `searchEntities()` on the FlowRAG interface.

### 4.5 `@flowrag/mcp`

New tool `flowrag_search_entities` with `query`, `limit?`, `type?` parameters.

### 4.6 Namespace Support

Entity vector records get `__ns` metadata field via `NamespacedVectorStorage` (already handled — upsert goes through the namespace wrapper).

## 5. Entity Vector Record Shape

```typescript
{
  id: `entity:${entity.id}`,
  vector: embedding,
  metadata: {
    _kind: 'entity',
    entityId: entity.id,
    name: entity.name,
    type: entity.type,
    description: entity.description,
  },
}
```

## 6. `searchEntities()` Interface

```typescript
searchEntities(query: string, options?: {
  limit?: number;
  type?: string;  // filter by entity type
}): Promise<EntitySearchResult[]>;
```

Implementation:
1. Embed query
2. `vector.search(queryVector, limit, { _kind: 'entity', ...(type ? { type } : {}) })`
3. For each result, `graph.getEntity(metadata.entityId)` to hydrate
4. Return `{ entity, score }[]`

## 7. Development Phases

### Phase 1: Core (`_kind` + entity embedding)
- [x] Add `_kind: 'chunk'` to chunk vector upserts in `processChunk()`
- [x] Add `{ _kind: 'chunk' }` filter to all existing searches in QueryPipeline
- [x] Add entity embedding post-processing step in `process()`
- [x] Add `EntitySearchResult` type to core
- [x] Tests

### Phase 2: Search + Lifecycle
- [x] Add `searchEntities()` to QueryPipeline
- [x] Expose `searchEntities()` in `createFlowRAG`
- [x] Update `deleteDocument()` to delete entity vectors
- [x] Update `mergeEntities()` to re-embed merged entity
- [x] Tests

### Phase 3: MCP + Docs
- [x] Add `flowrag_search_entities` tool to MCP server
- [x] Update documentation (querying guide, interfaces reference)
- [x] Update CLI `flowrag search --type entities` to use semantic search

---

*Created: 2026-03-07*
*Status: Complete*
