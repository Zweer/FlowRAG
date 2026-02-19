# Querying

FlowRAG combines vector search with knowledge graph traversal for richer results than either approach alone.

## Basic Search

```typescript
const results = await rag.search('how does authentication work');
```

Each result contains:

```typescript
interface SearchResult {
  id: string;           // chunk ID
  content: string;      // chunk text
  score: number;        // relevance score
  source: 'vector' | 'graph';
  sources: Source[];    // citation / provenance
  metadata?: Record<string, unknown>;
}

interface Source {
  documentId: string;
  filePath?: string;
  chunkIndex: number;
}
```

## Query Modes

```typescript
await rag.search('query', { mode: 'hybrid' }); // default
```

| Mode | Strategy | Best For |
|------|----------|----------|
| `hybrid` | Vector + graph combined | General queries (default) |
| `local` | Focus on specific entities in query | "What does ServiceA do?" |
| `global` | High-level concepts and themes | "How does the system handle payments?" |
| `naive` | Vector search only, no graph | Simple similarity search |

## Dual Retrieval

In `hybrid`, `local`, and `global` modes, FlowRAG runs two retrieval paths:

1. **Vector search** — finds semantically similar chunks via embeddings
2. **Graph traversal** — identifies entities in the query, then follows their relationships to find connected context

Results are merged, deduplicated, and scored using configurable weights:

```typescript
const rag = createFlowRAG({
  schema,
  ...createLocalStorage('./data'),
  options: {
    querying: {
      defaultMode: 'hybrid',
      maxResults: 10,
      vectorWeight: 0.7,  // 70% weight to vector results
      graphWeight: 0.3,   // 30% weight to graph results
    },
  },
});
```

## Data Flow Tracing

Trace how data flows through your system:

```typescript
// Where does this data go?
const downstream = await rag.traceDataFlow('user-event', 'downstream');
// user-event → Kafka → Analytics → Dashboard

// Where does this data come from?
const upstream = await rag.traceDataFlow('dashboard-metric', 'upstream');
// Dashboard ← Analytics ← Kafka ← Multiple Services
```

## Path Finding

Find the shortest path between two entities:

```typescript
const path = await rag.findPath('ServiceA', 'ServiceB');
// ServiceA → Kafka → ServiceB
```

## Limiting Results

```typescript
await rag.search('query', { limit: 20 });
```

## Statistics

```typescript
const stats = await rag.stats();
// { documents: 50, chunks: 320, entities: 85, relations: 120, vectors: 320 }
```

## Export

Export the knowledge graph in multiple formats:

```typescript
await rag.export('json'); // Entities + relations as JSON
await rag.export('csv');  // Relation table (source, type, target, description)
await rag.export('dot');  // Graphviz digraph
```

## Evaluation

If an `Evaluator` is configured, run quality metrics on search results:

```typescript
const rag = createFlowRAG({
  schema,
  ...createLocalStorage('./data'),
  evaluator: myEvaluator, // implements Evaluator interface
});

const result = await rag.evaluate('how does auth work', { reference: 'expected answer' });
// result.scores: { precision: 0.85, recall: 0.72, faithfulness: 0.91 }
```

The `evaluate` method runs a search internally and passes results to the evaluator. See [Interfaces](/reference/interfaces#evaluator) for the `Evaluator` interface.
