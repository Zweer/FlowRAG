# Local Development

The simplest way to use FlowRAG — everything runs locally, data files are Git-friendly.

## Setup

```bash
npm install @flowrag/pipeline @flowrag/presets @flowrag/provider-gemini
```

::: tip
You need a Gemini API key for entity extraction. Get one at [ai.google.dev](https://ai.google.dev/).
:::

## Usage

```typescript
import { defineSchema } from '@flowrag/core';
import { createFlowRAG } from '@flowrag/pipeline';
import { createLocalStorage } from '@flowrag/presets';

const schema = defineSchema({
  entityTypes: ['SERVICE', 'DATABASE', 'PROTOCOL'],
  relationTypes: ['USES', 'PRODUCES', 'CONSUMES'],
});

const rag = createFlowRAG({
  schema,
  ...createLocalStorage('./data'),
});

// Index
await rag.index('./content');

// Search
const results = await rag.search('how does authentication work');
```

## What `createLocalStorage()` Does

It creates all three storage backends with sensible defaults:

| Storage | Implementation | Path |
|---------|---------------|------|
| KV | JSON files | `./data/kv/` |
| Vector | LanceDB | `./data/vectors/` |
| Graph | SQLite | `./data/graph.db` |

## CLI

For quick local usage without writing code:

```bash
# Install globally
npm install -g @flowrag/cli

# Initialize
flowrag init

# Index documents
flowrag index ./content
flowrag index ./content --force          # Re-index all
flowrag index ./content --interactive    # Review entities

# Search
flowrag search "how does OCPP work"

# Stats
flowrag stats
flowrag graph stats
```

## Git-Friendly

The `./data` directory contains plain files:
- JSON files for KV storage
- A SQLite database for the knowledge graph
- LanceDB files for vector embeddings

You can commit these to your repo for a fully portable knowledge base.

## Storage Layout

```
data/
├── kv/
│   ├── doc:readme.json
│   ├── chunk:readme:0.json
│   ├── extraction:a1b2c3.json    # LLM cache
│   └── docHash:doc:readme.json   # Incremental indexing
├── vectors/
│   └── chunks.lance/             # LanceDB table
└── graph.db                      # SQLite database
```
