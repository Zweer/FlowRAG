# FlowRAG v2 Roadmap

> Planned features for FlowRAG v2.

## 1. MCP Server (High Priority)

Model Context Protocol server to expose FlowRAG as a tool for AI assistants.

**Detailed spec**: [`.kiro/specs/v2-mcp/requirements.md`](../v2-mcp/requirements.md)

### Goals
- Expose `search`, `traceDataFlow`, `findPath`, `stats` as MCP tools
- Allow AI assistants (Claude, Kiro, etc.) to query the knowledge base directly
- Support both local (stdio) and remote (Streamable HTTP) transport
- Zero-config: point at a FlowRAG data directory and serve

### Package
`@flowrag/mcp` — standalone MCP server package

### Usage
```bash
# stdio transport (for local AI assistants)
flowrag mcp
# or
npx @flowrag/mcp --data ./data

# Streamable HTTP transport (for remote clients)
flowrag mcp --transport http --port 3000
```

### MCP Tools
- `flowrag_search` — search the knowledge base (vector + graph dual retrieval)
- `flowrag_trace` — trace data flow upstream/downstream
- `flowrag_path` — find path between entities
- `flowrag_stats` — index statistics
- `flowrag_entities` — list/filter entities
- `flowrag_relations` — get relations for an entity

### MCP Resources
- `flowrag://schema` — current schema definition (entity types, relation types, custom fields)

## 2. Other Planned Features

- **Streaming indexing**: Progress events during batch indexing
- **OpenAI provider**: `@flowrag/provider-openai` (GPT embeddings + extraction)
- **Anthropic provider**: `@flowrag/provider-anthropic` (Claude extraction)
- **Redis storage**: `@flowrag/storage-redis` (KV + Vector)
- **Multi-tenancy**: Namespace support for multi-workspace scenarios

---

*Created: 2026-02-16*
*Status: Planning*
