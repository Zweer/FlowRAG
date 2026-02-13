# Why We Built FlowRAG

*February 2026*

## The Problem

We had a simple need: index technical documentation and query it with an AI assistant. The documentation described microservices, protocols, data flows — things that are inherently connected.

We looked at existing RAG solutions. They were all Python. They all required running a server. They all assumed you had Neo4j or Postgres running somewhere. For a TypeScript project deployed on Lambda, none of this worked.

## What We Wanted

1. **A library, not a server.** Import it, use it, done. No Docker, no processes to manage.
2. **TypeScript native.** Our entire stack is TypeScript. Adding Python for one feature felt wrong.
3. **Lambda-friendly.** Stateless queries, fast cold starts, no persistent connections.
4. **Git-friendly storage.** Commit the knowledge base to the repo. Clone and query anywhere.
5. **Knowledge graphs.** Vector search finds similar text. But we needed to trace data flows: "Where does this event go? What services consume it?"

## The Inspiration

[LightRAG](https://github.com/HKUDS/LightRAG) showed us the architecture: separate KV, Vector, and Graph storage with dual retrieval (vector + graph). It's a brilliant design. But it's Python, it runs as a server, and it depends on external databases.

We took the architecture and rebuilt it for our world:

| Aspect | LightRAG | FlowRAG |
|--------|----------|---------|
| Language | Python | TypeScript |
| Model | Server | Library |
| Indexing | Continuous | Batch |
| Deploy | Container | Lambda |
| Storage | Neo4j, Postgres | SQLite, LanceDB, JSON files |

## The Result

FlowRAG is 12 packages, 325 tests, 100% coverage. It indexes documents, extracts entities and relations, builds a knowledge graph, and answers queries using both vector similarity and graph traversal.

You can run it locally with zero external services:

```typescript
const rag = createFlowRAG({
  schema,
  ...createLocalStorage('./data'),
});

await rag.index('./content');
const results = await rag.search('how does authentication work');
```

Or deploy it on AWS with S3, OpenSearch, and Bedrock:

```typescript
const rag = createFlowRAG({
  schema,
  storage: { kv: s3Storage, vector: osVector, graph: osGraph },
  embedder: new BedrockEmbedder(),
  extractor: new BedrockExtractor(),
});
```

Same API, different backends. That's the whole point.

## What's Next

FlowRAG v1 is complete. All six development phases are done. We're now focused on documentation, examples, and community feedback before the npm release.

If you're building RAG in TypeScript, [give it a try](https://github.com/Zweer/FlowRAG).
