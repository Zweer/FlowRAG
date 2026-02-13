# Indexing

FlowRAG uses a batch indexing pipeline: scan files, chunk them, extract entities via LLM, generate embeddings, and store everything.

## Basic Usage

```typescript
await rag.index('./content');
```

This processes all files in the directory recursively.

## Incremental Indexing

By default, FlowRAG skips unchanged documents. Each document's content is hashed (SHA-256) after processing and stored in KV storage. On re-index, only modified or new files are processed.

```typescript
// Only processes changed/new documents
await rag.index('./content');

// Force re-process everything
await rag.index('./content', { force: true });
```

## Pipeline Stages

```
Files → Scanner → Chunker → Extractor (LLM) → Embedder → Storage
```

### 1. Scanner

Reads files from the input path. Supports text files (`.txt`, `.md`, `.json`, etc.).

### 2. Chunker

Splits documents into chunks using token-based splitting:

- **Chunk size**: ~1200 tokens (default)
- **Overlap**: 100 tokens between chunks
- Uses tiktoken for accurate tokenization

### 3. Extractor

The LLM reads each chunk and extracts:
- **Entities**: named things (services, databases, protocols...)
- **Relations**: connections between entities (uses, produces, depends on...)
- **Custom fields**: if defined in the schema

Extraction results are cached in KV storage to avoid re-processing identical chunks.

### 4. Embedder

Generates vector embeddings for each chunk, enabling semantic search.

### 5. Storage

Saves everything to three stores:
- **KV**: documents, chunks, extraction cache, document hashes
- **Vector**: chunk embeddings for semantic search
- **Graph**: entities and relations for knowledge graph traversal

## Concurrency Control

Configure parallel processing via options:

```typescript
const rag = createFlowRAG({
  schema,
  ...createLocalStorage('./data'),
  options: {
    indexing: {
      chunkSize: 1200,        // tokens per chunk
      chunkOverlap: 100,      // overlap between chunks
      maxParallelInsert: 2,   // concurrent documents
      llmMaxAsync: 4,         // concurrent LLM calls
      embeddingMaxAsync: 16,  // concurrent embedding calls
    },
  },
});
```

## Human-in-the-Loop

When using the CLI with `--interactive`, you can review extracted entities before they're stored:

```bash
flowrag index ./content --interactive
```

This shows each extracted entity and relation, letting you accept, reject, or edit them. See [CLI Reference](/reference/cli) for details.

## Pipeline Hooks

For programmatic control, use the `onEntitiesExtracted` hook:

```typescript
const rag = createFlowRAG({
  schema,
  ...createLocalStorage('./data'),
  hooks: {
    onEntitiesExtracted: async (extraction, context) => {
      // Filter, modify, or log extracted entities
      console.log(`Chunk ${context.chunkId}: ${extraction.entities.length} entities`);
      return extraction;
    },
  },
});
```
