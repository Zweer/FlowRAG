# MCP Server

`@flowrag/mcp` exposes your FlowRAG knowledge base to AI assistants via the [Model Context Protocol](https://modelcontextprotocol.io/).

## Installation

```bash
npm install -g @flowrag/mcp
```

Or run directly:

```bash
npx @flowrag/mcp --data ./data --docs ./content
```

## Configuration

Create `flowrag.config.json` in your project root:

```json
{
  "data": "./data",
  "docs": "./content",
  "schema": {
    "entityTypes": ["SERVICE", "DATABASE", "PROTOCOL"],
    "relationTypes": ["USES", "PRODUCES", "CONSUMES"]
  },
  "embedder": { "provider": "local" },
  "extractor": { "provider": "gemini" }
}
```

API keys go in a `.env` file (auto-loaded on startup):

```bash
GEMINI_API_KEY=your-key-here
```

### CLI Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--config <path>` | Config file path | `./flowrag.config.json` |
| `--data <path>` | Data directory | `./data` |
| `--docs <path>` | Documents directory | — |

Priority: CLI flags > config file > defaults. For the simplest case, no config file is needed:

```bash
npx @flowrag/mcp --data ./data --docs ./content
```

### Provider Defaults

| Provider | Embedder Model | Extractor Model |
|----------|---------------|-----------------|
| `local` | `Xenova/e5-small-v2` | — (not available) |
| `gemini` | `gemini-embedding-001` | `gemini-3-flash-preview` |
| `bedrock` | `amazon.titan-embed-text-v2:0` | `anthropic.claude-haiku-4-5-20251001-v1:0` |

::: tip
`local` has no extractor — pair it with `gemini` or `bedrock` for entity extraction.
:::

## AI Assistant Setup

### Claude Desktop

Add to your Claude Desktop config (`claude_desktop_config.json`):

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

### Kiro

Add to your project's `mcp.json`:

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

## Tools

The MCP server exposes 7 tools that AI assistants can call:

### `flowrag_index`

Index documents into the knowledge base.

| Parameter | Type | Description |
|-----------|------|-------------|
| `force` | `boolean?` | Re-index all documents, ignore hashes |

Uses the `docs` path from config. Unchanged documents are skipped automatically via SHA-256 hashing.

### `flowrag_search`

Search with dual retrieval (vector + graph).

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | `string` | Search query (required) |
| `mode` | `string?` | `hybrid`, `local`, `global`, `naive` (default: `hybrid`) |
| `limit` | `number?` | Max results (default: 5) |

### `flowrag_entities`

List or filter entities in the knowledge graph.

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | `string?` | Filter by entity type (e.g. `SERVICE`) |
| `query` | `string?` | Filter by name/description substring |
| `limit` | `number?` | Max results (default: 20) |

### `flowrag_relations`

Get relations for a specific entity.

| Parameter | Type | Description |
|-----------|------|-------------|
| `entity` | `string` | Entity name (required) |
| `direction` | `string?` | `in`, `out`, `both` (default: `both`) |

### `flowrag_trace`

Trace data flow upstream or downstream from an entity.

| Parameter | Type | Description |
|-----------|------|-------------|
| `entity` | `string` | Entity name (required) |
| `direction` | `string` | `upstream` or `downstream` (required) |

### `flowrag_path`

Find the shortest path between two entities.

| Parameter | Type | Description |
|-----------|------|-------------|
| `from` | `string` | Source entity name (required) |
| `to` | `string` | Target entity name (required) |
| `maxDepth` | `number?` | Max traversal depth (default: 5) |

### `flowrag_stats`

Get index statistics. No parameters.

Returns document, chunk, entity, relation, and vector counts.

## Resources

### `flowrag://schema`

Exposes the current schema definition as JSON, so the AI assistant knows what entity types, relation types, and custom fields are available.

## Config Change Detection

After indexing, a `flowrag.meta.json` file is saved in the data directory with embedder, extractor, and schema info.

On startup, the server compares the current config with this metadata:

| Change | Severity | Effect |
|--------|----------|--------|
| Embedder changed | **Breaking** | Embeddings are incompatible — re-index required |
| Schema changed | Minor | New types apply on next indexing |
| Extractor changed | Minor | New extractions may differ |

## Entity Resolution

Tools that accept entity names (`flowrag_relations`, `flowrag_trace`, `flowrag_path`) resolve names using:

1. Exact match (entity ID)
2. Case-insensitive match
3. Substring match
4. Error if no match found

This means you can type `auth` and it will find `AuthService`.
