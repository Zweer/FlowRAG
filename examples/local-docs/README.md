# Local Documentation RAG

Index local documents and query them with FlowRAG. All data stays on disk — no external services except Gemini for entity extraction.

## Prerequisites

- Node.js ≥ 20
- A `GEMINI_API_KEY` for entity extraction ([get one here](https://ai.google.dev/))

## Setup

```bash
# From the FlowRAG monorepo root
npm install

# Set your Gemini API key
export GEMINI_API_KEY=your-key
```

## Usage

1. Place your documents (`.md`, `.txt`, `.json`, etc.) in a `content/` directory
2. Run the example:

```bash
npx tsx examples/local-docs/index.ts
```

## What Happens

1. **Scanner** reads all text files from `./content`
2. **Chunker** splits them into ~1200 token chunks
3. **Extractor** (Gemini) identifies entities and relations
4. **Embedder** (local ONNX) generates vector embeddings
5. Everything is stored in `./data` (JSON + LanceDB + SQLite)

## Storage Layout

```
data/
├── kv/           # JSON files (documents, chunks, cache)
├── vectors/      # LanceDB (embeddings)
└── graph.db      # SQLite (knowledge graph)
```

The `data/` directory is Git-friendly — commit it to version your knowledge base.
