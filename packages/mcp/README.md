# @flowrag/mcp

MCP (Model Context Protocol) server for FlowRAG. Exposes your knowledge base to AI assistants like Claude, Kiro, and Copilot.

## Quick Start

```bash
npx @flowrag/mcp --data ./data --docs ./content
```

Or with a config file:

```bash
npx @flowrag/mcp --config ./flowrag.config.json
```

## Configuration

Create `flowrag.config.json`:

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

API keys go in `.env` (auto-loaded from config directory or cwd):

```bash
GEMINI_API_KEY=your-key-here
```

### CLI Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--config <path>` | Config file path | `./flowrag.config.json` |
| `--data <path>` | Data directory | `./data` |
| `--docs <path>` | Documents directory | — |

Priority: CLI flags > config file > defaults.

## AI Assistant Setup

### Claude Desktop / Kiro

Add to `mcp.json`:

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

| Tool | Description |
|------|-------------|
| `flowrag_index` | Index documents into the knowledge base |
| `flowrag_search` | Search with dual retrieval (vector + graph) |
| `flowrag_entities` | List or filter entities in the knowledge graph |
| `flowrag_relations` | Get relations for a specific entity |
| `flowrag_trace` | Trace data flow upstream or downstream |
| `flowrag_path` | Find shortest path between two entities |
| `flowrag_stats` | Get index statistics |

## Resources

| Resource | Description |
|----------|-------------|
| `flowrag://schema` | Current schema definition (JSON) |

## Config Change Detection

After indexing, a `flowrag.meta.json` is saved in the data directory. On startup, the server compares the current config with metadata and warns about:

- **Breaking**: Embedder changed → re-index required
- **Minor**: Schema or extractor changed → new types apply on next index

## Remote / HTTP Mode

Run as a centralized HTTP server for team use:

```json
{
  "transport": "http",
  "port": 3000,
  "auth": { "token": "${FLOWRAG_AUTH_TOKEN}" },
  "storage": {
    "kv": { "provider": "redis", "url": "redis://redis.internal:6379" },
    "vector": { "provider": "opensearch", "node": "https://os:9200", "dimensions": 1024 },
    "graph": { "provider": "opensearch", "node": "https://os:9200" }
  }
}
```

Clients connect via URL:

```json
{
  "mcpServers": {
    "flowrag": {
      "url": "https://flowrag.company.com/mcp",
      "headers": { "Authorization": "Bearer ${FLOWRAG_TOKEN}" }
    }
  }
}
```

A Dockerfile is included for Fargate/ECS deployment. See the [deployment guide](https://zweer.github.io/FlowRAG/deployment/remote-mcp) for details.

## License

MIT
