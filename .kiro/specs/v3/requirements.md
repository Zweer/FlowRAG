# FlowRAG v3 Roadmap

> Planned features for FlowRAG v3 — focused on extensibility through interfaces and closing feature gaps with LightRAG.

## Design Philosophy

**Interfaces, not implementations.** Instead of building every feature in-house, provide extension points that let users plug in their preferred tools. One interface can unlock dozens of integrations.

## 1. OpenAI-Compatible Provider

Add `baseURL` support to `@flowrag/provider-openai` so it works with any OpenAI-compatible API.

```typescript
const embedder = new OpenAIEmbedder({
  baseURL: 'http://localhost:11434/v1', // Ollama
  model: 'nomic-embed-text',
});

const extractor = new OpenAIExtractor({
  baseURL: 'https://my-company.openai.azure.com', // Azure OpenAI
  model: 'gpt-4o',
  apiKey: process.env.AZURE_OPENAI_KEY,
});
```

**Unlocks**: Ollama, Azure OpenAI, vLLM, LiteLLM, Together, Groq, Mistral, any OpenAI-compatible endpoint.

## 2. DocumentParser Interface

Pluggable file parsing to support multimodal documents.

```typescript
interface DocumentParser {
  readonly supportedExtensions: string[];
  parse(filePath: string): Promise<ParsedDocument>;
}

interface ParsedDocument {
  content: string;
  metadata: Record<string, unknown>;
}
```

**Default**: Plain text / Markdown (current behavior).
**Plugins**: PDF (pdf-parse), DOCX (mammoth), images (OCR), or full multimodal (Unstructured, LlamaParse).

```typescript
const rag = createFlowRAG({
  schema,
  storage,
  embedder,
  extractor,
  parsers: [new PDFParser(), new DocxParser()], // pluggable
});
```

## 3. Document Deletion with KG Regeneration

Delete a document and automatically clean up its entities and relations from the knowledge graph.

```typescript
await rag.deleteDocument('doc:readme');
// Removes document, its chunks, and entities/relations that belong ONLY to this document.
// Entities shared with other documents are preserved, descriptions rebuilt.
```

**Inspired by**: LightRAG's `adelete_by_doc_id` with smart cleanup.

## 4. Entity Merging

Merge duplicate entities extracted by the LLM.

```typescript
await rag.mergeEntities({
  sources: ['Auth Service', 'AuthService', 'auth-service'],
  target: 'Auth Service',
});
// Redirects all relations, deduplicates, removes source entities.
```

## 5. Citation / Source Attribution

Track which document and chunk each entity/relation came from, and return source references in search results.

```typescript
const results = await rag.search('how does auth work');
// Each result includes:
// { content, score, sources: [{ documentId, filePath, chunkIndex }] }
```

## 6. Observability Hooks

Extension points for tracing, monitoring, and token tracking.

```typescript
interface ObservabilityHooks {
  onLLMCall?: (params: { model: string; prompt: string; tokens: TokenUsage }) => void;
  onEmbedding?: (params: { model: string; texts: string[]; tokens: number }) => void;
  onSearch?: (params: { query: string; mode: string; duration: number }) => void;
}
```

**Unlocks**: Langfuse, OpenTelemetry, custom dashboards, cost tracking.

```typescript
const rag = createFlowRAG({
  // ...
  observability: {
    onLLMCall: ({ model, tokens }) => langfuse.trace({ model, ...tokens }),
  },
});
```

## 7. Export

Export knowledge graph data in various formats.

```typescript
await rag.export('graph.csv', { format: 'csv' });
await rag.export('graph.json', { format: 'json' });
await rag.export('graph.dot', { format: 'dot' }); // Graphviz
```

The CLI already has `flowrag graph export --format dot`. This extends it programmatically with more formats.

## 8. Evaluation Interface

Pluggable evaluation for RAG quality metrics.

```typescript
interface Evaluator {
  evaluate(query: string, results: SearchResult[], reference?: string): Promise<EvalResult>;
}

interface EvalResult {
  scores: Record<string, number>; // e.g. { precision: 0.85, recall: 0.72, faithfulness: 0.91 }
}
```

**Unlocks**: RAGAS-style metrics, custom evaluators, A/B testing.

## 9. Entity Extraction Gleaning

Multi-pass entity extraction for higher accuracy. Run the LLM multiple times on the same chunk, appending previous results as context.

```typescript
const rag = createFlowRAG({
  // ...
  options: {
    indexing: {
      extractionGleanings: 2, // Run extraction 2 additional times
    },
  },
});
```

**Inspired by**: LightRAG's `entity_extract_max_gleaning`.

## Priority Order

| # | Feature | Impact | Effort |
|---|---------|--------|--------|
| 1 | OpenAI-compatible (`baseURL`) | 🔥 High — unlocks dozens of providers | Low |
| 2 | Document deletion + KG cleanup | High — production essential | Medium |
| 3 | Citation / source attribution | High — trust & traceability | Medium |
| 4 | DocumentParser interface | High — multimodal support | Medium |
| 5 | Entity merging | Medium — data quality | Medium |
| 6 | Observability hooks | Medium — ops & cost control | Low |
| 7 | Export | Medium — data portability | Low |
| 8 | Extraction gleaning | Medium — accuracy boost | Low |
| 9 | Evaluation interface | Medium — quality assurance | Medium |

## Comparison with LightRAG

After v3, the feature gap with LightRAG will be largely closed, while maintaining FlowRAG's unique advantages:

| | LightRAG | FlowRAG (after v3) |
|---|----------|-------------------|
| Language | Python | TypeScript |
| Model | Server | Library (Lambda-friendly) |
| Storage | Git-unfriendly | Git-friendly |
| Extensibility | Built-in everything | Interface-driven plugins |
| Testing | Not declared | 100% coverage |
| Multi-tenancy | Workspace param | Namespace wrappers |
| Multimodal | RAG-Anything | DocumentParser interface |
| LLM providers | Many built-in | OpenAI-compatible covers all |
| Observability | Langfuse only | Pluggable hooks |

---

*Created: 2026-02-18*
*Status: Planning*
