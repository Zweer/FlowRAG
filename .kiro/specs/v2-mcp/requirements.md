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
| `gemini` | `text-embedding-004` | 768 | `gemini-3-flash-preview` |
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
    "model": "text-embedding-004",
    "dimensions": 768
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

### 6.1 stdio (default)

Standard input/output transport for local AI assistants. This is the primary use case.

### 6.2 Streamable HTTP (optional)

HTTP transport for remote clients or web-based AI assistants. Configured via `transport: "http"` and `port` in the config file.

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
│   ├── index.ts          # CLI entry point (bin)
│   ├── config.ts         # Config loading, validation, defaults
│   ├── metadata.ts       # Metadata file read/write, config change detection
│   ├── server.ts         # MCP server setup (McpServer, tools, resources)
│   ├── factory.ts        # Create FlowRAG instance from config
│   ├── resolve.ts        # Entity name resolution
│   ├── tools/
│   │   ├── index.ts      # flowrag_index tool
│   │   ├── search.ts     # flowrag_search tool
│   │   ├── entities.ts   # flowrag_entities tool
│   │   ├── relations.ts  # flowrag_relations tool
│   │   ├── trace.ts      # flowrag_trace tool
│   │   ├── path.ts       # flowrag_path tool
│   │   └── stats.ts      # flowrag_stats tool
│   └── resources/
│       └── schema.ts     # flowrag://schema resource
├── test/
│   ├── config.test.ts
│   ├── metadata.test.ts
│   ├── server.test.ts
│   ├── factory.test.ts
│   ├── resolve.test.ts
│   ├── tools/
│   │   ├── index.test.ts
│   │   ├── search.test.ts
│   │   ├── entities.test.ts
│   │   ├── relations.test.ts
│   │   ├── trace.test.ts
│   │   ├── path.test.ts
│   │   └── stats.test.ts
│   └── resources/
│       └── schema.test.ts
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

Add `mcp` subcommand that delegates to `@flowrag/mcp`:

```bash
flowrag mcp                              # uses ./flowrag.config.json
flowrag mcp --config /path/to/config.json
```

## 11. Testing Strategy

- Unit tests for config loading and validation
- Unit tests for metadata read/write and change detection
- Unit tests for each tool (mock FlowRAG instance)
- Unit tests for entity resolution
- Unit tests for resource handlers
- Unit tests for factory (FlowRAG instance creation from config)
- 100% coverage target

## 12. Development Phases

### Phase 1: Config & Factory
- [ ] Package scaffolding (package.json, tsconfig, etc.)
- [ ] Config loading, validation, defaults (`config.ts`)
- [ ] FlowRAG instance creation from config (`factory.ts`)
- [ ] Metadata file read/write (`metadata.ts`)
- [ ] Tests

### Phase 2: Core Tools
- [ ] MCP server setup with stdio transport (`server.ts`)
- [ ] `flowrag_index` tool
- [ ] `flowrag_search` tool
- [ ] `flowrag_stats` tool
- [ ] `flowrag://schema` resource
- [ ] Tests

### Phase 3: Graph Tools
- [ ] Entity name resolution (`resolve.ts`)
- [ ] `flowrag_entities` tool
- [ ] `flowrag_relations` tool
- [ ] `flowrag_trace` tool
- [ ] `flowrag_path` tool
- [ ] Tests

### Phase 4: Transport & CLI
- [ ] Streamable HTTP transport support
- [ ] CLI entry point (`bin` in package.json)
- [ ] `flowrag mcp` subcommand in `@flowrag/cli`
- [ ] Config change detection warnings
- [ ] Tests

### Phase 5: Documentation
- [ ] Package README
- [ ] VitePress docs page (`docs/guide/mcp.md`)
- [ ] Configuration examples for Claude Desktop, Kiro, VS Code
- [ ] Update main README

## 13. Success Criteria

1. `npx @flowrag/mcp` starts a working MCP server with a single config file
2. AI assistants can index documents, search, and explore the knowledge graph
3. Config changes are detected and the user is warned about re-indexing needs
4. 100% test coverage
5. Works with Claude Desktop, Kiro, and any MCP-compatible client

---

*Created: 2026-02-18*
*Status: Ready for implementation*
