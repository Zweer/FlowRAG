# FlowRAG MCP Server Requirements

> Detailed specification for `@flowrag/mcp` — an MCP server that exposes FlowRAG as a tool for AI assistants.

## 1. Overview

### 1.1 Goal

Allow AI assistants (Claude, Kiro, Copilot, etc.) to index documents and query a FlowRAG knowledge base directly via the [Model Context Protocol](https://modelcontextprotocol.io/).

### 1.2 Design Principles

- **Zero-config**: A single `flowrag.config.json` file drives everything
- **Full access**: The MCP server can both index and query (not read-only)
- **Standalone**: Works as `npx @flowrag/mcp` without needing the CLI package
- **Config-driven**: No programmatic API — all customization via config file and CLI flags
- **Config-aware**: Detects config changes and warns about re-indexing needs

### 1.3 Package

`@flowrag/mcp` — standalone MCP server package

### 1.4 SDK Version

Uses `@modelcontextprotocol/sdk` v1.x (stable, production-ready). Will migrate to v2 when it ships stable.

## 2. Configuration

### 2.1 Config File

All configuration lives in `flowrag.config.json`:

```json
{
  "data": "./data",
  "docs": "./content",
  "schema": {
    "entityTypes": ["SERVICE", "DATABASE", "PROTOCOL", "TEAM"],
    "relationTypes": ["USES", "PRODUCES", "CONSUMES", "OWNS"],
    "entityFields": {
      "status": { "type": "enum", "values": ["active", "deprecated"], "default": "active" }
    }
  },
  "embedder": {
    "provider": "local"
  },
  "extractor": {
    "provider": "gemini"
  },
  "transport": "stdio"
}
```

### 2.2 Config Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `data` | `string` | `"./data"` | Path to FlowRAG data directory |
| `docs` | `string` | — | Path to documents directory (default for `flowrag_index`) |
| `schema.entityTypes` | `string[]` | `["SERVICE", "DATABASE", "PROTOCOL", "TEAM", "CONCEPT"]` | Entity types for extraction |
| `schema.relationTypes` | `string[]` | `["USES", "PRODUCES", "CONSUMES", "OWNS", "DEPENDS_ON"]` | Relation types for extraction |
| `schema.documentFields` | `object` | `{}` | Custom document fields |
| `schema.entityFields` | `object` | `{}` | Custom entity fields |
| `schema.relationFields` | `object` | `{}` | Custom relation fields |
| `embedder.provider` | `string` | `"local"` | `"local"`, `"gemini"`, or `"bedrock"` |
| `embedder.model` | `string` | provider default | Model name override |
| `extractor.provider` | `string` | `"gemini"` | `"gemini"` or `"bedrock"` |
| `extractor.model` | `string` | provider default | Model name override |
| `transport` | `string` | `"stdio"` | `"stdio"` or `"http"` |
| `port` | `number` | `3000` | Port for HTTP transport |

### 2.3 Provider Defaults

| Provider | Embedder Model | Dimensions | Extractor Model |
|----------|---------------|------------|-----------------|
| `local` | `Xenova/e5-small-v2` | 384 | — (not available) |
| `gemini` | `gemini-embedding-001` | 3072 | `gemini-3-flash-preview` |
| `bedrock` | `amazon.titan-embed-text-v2:0` | 1024 | `anthropic.claude-haiku-4-5-20251001-v1:0` |

Note: `local` has no extractor — if `embedder.provider` is `"local"`, the `extractor` must be `"gemini"` or `"bedrock"`.

### 2.4 CLI Usage

```bash
npx @flowrag/mcp                                # uses ./flowrag.config.json
npx @flowrag/mcp --config /path/to/config.json   # explicit config path
npx @flowrag/mcp --data ./data --docs ./content  # no config file needed
```

CLI flags override config file values. Priority: CLI flags > config file > defaults.

| Flag | Description | Default |
|------|-------------|---------|
| `--config <path>` | Path to config file | `./flowrag.config.json` |
| `--data <path>` | Path to data directory | `./data` |
| `--docs <path>` | Path to documents directory | — |

For the simplest use case, no config file is needed:

```bash
# Just point at your data and docs — uses local embedder + gemini extractor
npx @flowrag/mcp --data ./data --docs ./content
```

For full customization (schema, providers, transport), use a config file.

### 2.5 AI Assistant Configuration

Claude Desktop / Kiro (`mcp.json`):

```json
{
  "mcpServers": {
    "flowrag": {
      "command": "npx",
      "args": ["@flowrag/mcp", "--config", "/path/to/flowrag.config.json"]
    }
  }
}
```

### 2.6 Environment Variables

API keys are NOT in the config file — they come from environment variables:

| Variable | Required for |
|----------|-------------|
| `GEMINI_API_KEY` | `embedder.provider: "gemini"` or `extractor.provider: "gemini"` |
| `AWS_REGION` | `embedder.provider: "bedrock"` or `extractor.provider: "bedrock"` |

The server automatically loads a `.env` file on startup (via `dotenv`). Lookup order:

1. `.env` in the same directory as the config file
2. `.env` in the current working directory

This avoids putting secrets in `mcp.json` or relying on the shell environment (which AI assistants like Kiro/Claude Desktop may not inherit).

Example `.env`:
```bash
GEMINI_API_KEY=your-key-here
AWS_REGION=eu-central-1
```

Make sure `.env` is in your `.gitignore`.

## 3. Metadata & Config Change Detection

### 3.1 Metadata File

After each indexing run, the server saves `flowrag.meta.json` in the data directory:

```json
{
  "configHash": "a1b2c3d4",
  "embedder": {
    "provider": "gemini",
    "model": "gemini-embedding-001",
    "dimensions": 3072
  },
  "extractor": {
    "provider": "gemini",
    "model": "gemini-3-flash-preview"
  },
  "schema": {
    "entityTypes": ["SERVICE", "DATABASE"],
    "relationTypes": ["USES", "PRODUCES"]
  },
  "lastIndexedAt": "2026-02-18T10:00:00Z",
  "documentCount": 50
}
```

### 3.2 Config Change Detection

On startup, the server compares the current config with `flowrag.meta.json`:

| Change | Severity | Action |
|--------|----------|--------|
| Embedder changed | **Breaking** | Warn: "Embedder changed. Re-index required (`force: true`)." |
| Schema entity/relation types changed | **Minor** | Warn: "Schema changed. New types will apply to next indexing." |
| Extractor changed | **Minor** | Warn: "Extractor changed. New extractions may differ." |
| Data path changed | **None** | New data directory, fresh start |

Breaking changes block queries (embeddings are incompatible). Minor changes just log a warning.

### 3.3 Pipeline Integration

The metadata file is written by the indexing pipeline. This requires a small change to `@flowrag/pipeline`:

- After `rag.index()` completes, write/update `flowrag.meta.json` in the data directory
- The metadata includes embedder info, schema, and timestamp

This change benefits both the MCP server and the CLI (which could also show warnings).

## 4. MCP Tools

Seven tools exposed to AI assistants. All tools are always available.

### 4.1 `flowrag_index`

Index documents from a directory into the knowledge base.

```typescript
{
  force?: boolean;    // Re-index all documents, ignore hashes (default: false)
}

// Output: text summary
// "Indexed 50 documents, 320 chunks, 85 entities, 120 relations"
```

Uses the `docs` path from config (or `--docs` CLI flag). Returns an error if no docs path is configured.

Unchanged documents are skipped automatically (SHA-256 content hashing). Use `force: true` to re-process everything.

This is a potentially long-running operation. The tool should report progress if possible.

### 4.2 `flowrag_search`

Search the knowledge base with dual retrieval (vector + graph).

```typescript
{
  query: string;          // Search query (required)
  mode?: 'hybrid' | 'local' | 'global' | 'naive';  // Default: 'hybrid'
  limit?: number;         // Default: 5
}

// Output: text content with formatted results
// Each result shows: source (vector/graph), score, content snippet
```

### 4.3 `flowrag_entities`

List or filter entities in the knowledge graph.

```typescript
{
  type?: string;          // Filter by entity type (e.g. 'SERVICE')
  query?: string;         // Filter by name/description substring
  limit?: number;         // Default: 20
}

// Output: text content with entity list
// Each entity shows: type, name, description
```

### 4.4 `flowrag_relations`

Get relations for a specific entity.

```typescript
{
  entity: string;         // Entity name or ID (required)
  direction?: 'in' | 'out' | 'both';  // Default: 'both'
}

// Output: text content with relation list
// Each relation shows: source --[TYPE]--> target, description
```

### 4.5 `flowrag_trace`

Trace data flow upstream or downstream from an entity.

```typescript
{
  entity: string;         // Entity name or ID (required)
  direction: 'upstream' | 'downstream';  // Required
}

// Output: text content with entity chain
// e.g. "ServiceA → Kafka → Analytics → Dashboard"
```

### 4.6 `flowrag_path`

Find the shortest path between two entities in the knowledge graph.

```typescript
{
  from: string;           // Source entity name or ID (required)
  to: string;             // Target entity name or ID (required)
  maxDepth?: number;      // Default: 5
}

// Output: text content with relation chain
// e.g. "ServiceA --[PRODUCES]--> Kafka --[CONSUMES]--> ServiceB"
```

### 4.7 `flowrag_stats`

Get index statistics.

```typescript
// Input: (none)

// Output: text content with stats
// Documents: 50, Chunks: 320, Entities: 85, Relations: 120, Vectors: 320
```

## 5. MCP Resources

### 5.1 `flowrag://schema`

Exposes the current schema definition so the AI assistant understands what entity types, relation types, and custom fields are available.

```typescript
// URI: flowrag://schema
// MIME type: application/json
// Content: { entityTypes, relationTypes, documentFields, entityFields, relationFields }
```

## 6. Transport

### 6.1 stdio

Standard input/output transport for local AI assistants. All major MCP clients (Claude Desktop, Kiro, VS Code) use stdio.

> **Decision (2026-02-18)**: Streamable HTTP transport was originally planned but removed. The use case (remote AI assistant connecting to FlowRAG) doesn't exist today — all MCP clients run locally with stdio. For server-side use cases (e.g., chatbot Lambda), FlowRAG should be used directly as a library, not through MCP. HTTP transport can be added later as a retrocompatible change if needed.

## 7. Entity Resolution

Tools that accept entity names (`flowrag_trace`, `flowrag_path`, `flowrag_relations`) need to resolve names to IDs. Resolution strategy:

1. Exact match
2. Case-insensitive match
3. Substring match
4. Return error if no match found

## 8. Package Structure

```
packages/mcp/
├── src/
│   ├── index.ts          # Barrel exports + CLI entry point
│   ├── main.ts           # Main logic (parseArgs → config → factory → server)
│   ├── config.ts         # Config loading, validation, defaults
│   ├── metadata.ts       # Metadata file read/write, config change detection
│   ├── server.ts         # MCP server setup (McpServer, tools, resources)
│   ├── factory.ts        # Create FlowRAG instance from config
│   └── resolve.ts        # Entity name resolution
├── test/
│   ├── config.test.ts
│   ├── metadata.test.ts
│   ├── server.test.ts
│   ├── factory.test.ts
│   ├── resolve.test.ts
│   └── main.test.ts
├── package.json
└── README.md
```

## 9. Dependencies

```json
{
  "dependencies": {
    "@flowrag/core": "workspace:*",
    "@flowrag/pipeline": "workspace:*",
    "@flowrag/presets": "workspace:*",
    "@flowrag/provider-local": "workspace:*",
    "@flowrag/provider-gemini": "workspace:*",
    "@flowrag/provider-bedrock": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.27.0"
  },
  "peerDependencies": {
    "zod": "^3.25.0"
  }
}
```

All three providers are dependencies because the config file determines which one to use at runtime. The unused providers are not instantiated.

## 10. Changes to Existing Packages

### 10.1 `@flowrag/pipeline`

The indexing pipeline needs to write `flowrag.meta.json` after indexing:

- Add `dataPath` to `FlowRAGConfig` (optional, for metadata file location)
- After `rag.index()`, write metadata with embedder info, schema, and timestamp
- This is a non-breaking change (metadata writing is opt-in via `dataPath`)

### 10.2 `@flowrag/cli`

> **Decision (2026-02-18)**: The `flowrag mcp` subcommand was originally planned but removed. MCP and CLI serve different audiences (AI assistants vs humans). Adding `@flowrag/mcp` as a CLI dependency would bloat the CLI with the MCP SDK for a command most CLI users won't need. Users who want MCP just run `npx @flowrag/mcp` directly.

## 11. Testing Strategy

- Unit tests for config loading and validation
- Unit tests for metadata read/write and change detection
- Unit tests for each tool (mock FlowRAG instance)
- Unit tests for entity resolution
- Unit tests for resource handlers
- Unit tests for factory (FlowRAG instance creation from config)
- 100% coverage target

## 12. Development Phases

### Phase 1: Config & Factory ✅
- [x] Package scaffolding (package.json, tsconfig, etc.)
- [x] Config loading, validation, defaults (`config.ts`)
- [x] FlowRAG instance creation from config (`factory.ts`)
- [x] Metadata file read/write (`metadata.ts`)
- [x] Tests

### Phase 2: Core Tools ✅
- [x] MCP server setup with stdio transport (`server.ts`)
- [x] `flowrag_index` tool
- [x] `flowrag_search` tool
- [x] `flowrag_stats` tool
- [x] `flowrag://schema` resource
- [x] Tests

### Phase 3: Graph Tools ✅
- [x] Entity name resolution (`resolve.ts`)
- [x] `flowrag_entities` tool
- [x] `flowrag_relations` tool
- [x] `flowrag_trace` tool
- [x] `flowrag_path` tool
- [x] Tests

### Phase 4: Entry Point ✅
- [x] CLI entry point (`bin` in package.json)
- [x] Config change detection warnings on startup (`main.ts`)
- [x] Tests
- ~~Streamable HTTP transport~~ — removed (see §6)
- ~~`flowrag mcp` CLI subcommand~~ — removed (see §10.2)

### Phase 5: Documentation ✅
- [x] Package README
- [x] VitePress docs page (`docs/guide/mcp.md`)
- [x] Configuration examples for Claude Desktop, Kiro
- [x] Update main README

## 13. Success Criteria

1. `npx @flowrag/mcp` starts a working MCP server with a single config file
2. AI assistants can index documents, search, and explore the knowledge graph
3. Config changes are detected and the user is warned about re-indexing needs
4. 100% test coverage
5. Works with Claude Desktop, Kiro, and any MCP-compatible client

---

*Created: 2026-02-18*
*Status: Complete*
