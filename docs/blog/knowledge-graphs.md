# Knowledge Graphs: The Missing Piece in RAG

*February 2026*

## The Limits of Vector Search

Most RAG systems work like this:

1. Chunk your documents
2. Generate embeddings
3. Store in a vector database
4. On query, find the most similar chunks

This works well for "find me text about X." But it fails for questions like:

- "What services depend on the payment gateway?"
- "Trace the data flow from user signup to the analytics dashboard"
- "What happens if the auth service goes down?"

These questions aren't about text similarity. They're about **relationships**.

## Enter Knowledge Graphs

A knowledge graph stores entities (things) and relations (connections between things):

```
[Auth Service] --USES--> [PostgreSQL]
[Auth Service] --PRODUCES--> [JWT Token]
[API Gateway] --DEPENDS_ON--> [Auth Service]
[Analytics] --CONSUMES--> [User Events]
```

When you ask "what depends on the auth service?", a vector search might find a chunk that mentions it. A knowledge graph directly answers: API Gateway depends on it.

## Dual Retrieval

FlowRAG combines both approaches:

```
Query: "What happens if auth goes down?"
                    │
        ┌───────────┴───────────┐
        │                       │
   Vector Search           Graph Traversal
   "Find chunks about      "Find entities
    auth failures"          connected to Auth"
        │                       │
        └───────────┬───────────┘
                    │
              Merge & Dedupe
                    │
              Rich Results
```

Vector search finds relevant text passages. Graph traversal finds connected entities and their context. Together, they provide answers that neither could alone.

## How FlowRAG Builds the Graph

During indexing, an LLM reads each chunk and extracts:

- **Entities**: named things with types (SERVICE, DATABASE, PROTOCOL...)
- **Relations**: typed connections with descriptions and keywords

```typescript
// The LLM extracts this from your documentation:
{
  entities: [
    { name: 'Auth Service', type: 'SERVICE', description: 'Handles authentication...' },
    { name: 'PostgreSQL', type: 'DATABASE', description: 'Primary data store...' },
  ],
  relations: [
    { source: 'Auth Service', target: 'PostgreSQL', type: 'USES', keywords: ['auth', 'storage'] },
  ],
}
```

The schema guides extraction but doesn't limit it — unknown types fall back to `Other`.

## Data Flow Tracing

The killer feature for technical documentation:

```typescript
// Trace downstream: where does data from this service go?
const flow = await rag.traceDataFlow('user-event', 'downstream');
// user-event → Kafka → Analytics → Dashboard

// Trace upstream: where does this data come from?
const sources = await rag.traceDataFlow('dashboard-metric', 'upstream');
// Dashboard ← Analytics ← Kafka ← Multiple Services

// Find path between two entities
const path = await rag.findPath('ServiceA', 'ServiceB');
// ServiceA → Kafka → ServiceB
```

Try doing that with vector search alone.

## Custom Fields

For even richer graphs, add custom fields to entities and relations:

```typescript
const schema = defineSchema({
  entityTypes: ['SERVICE', 'DATABASE'],
  relationTypes: ['USES', 'PRODUCES'],
  entityFields: {
    status: { type: 'enum', values: ['active', 'deprecated'] },
    owner: { type: 'string' },
  },
  relationFields: {
    syncType: { type: 'enum', values: ['sync', 'async'] },
  },
});
```

Now your graph doesn't just know that Service A uses Database B — it knows the connection is async, the service is active, and it's owned by team-payments.

## The Bottom Line

Vector search finds similar text. Knowledge graphs find connected context. RAG needs both.

FlowRAG builds the graph automatically from your documents and uses it alongside vector search for every query. No Neo4j, no Postgres — just SQLite (or OpenSearch for cloud deployments).
