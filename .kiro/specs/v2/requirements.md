# FlowRAG v2 Roadmap

> Planned features for FlowRAG v2.

## 1. MCP Server ✅ Complete

Model Context Protocol server to expose FlowRAG as a tool for AI assistants.

**Detailed spec**: [`.kiro/specs/v2-mcp/requirements.md`](../v2-mcp/requirements.md)

### Goals
- Expose `search`, `traceDataFlow`, `findPath`, `stats` as MCP tools
- Allow AI assistants (Claude, Kiro, etc.) to query the knowledge base directly
- stdio transport (all major MCP clients use it)
- Config-driven: single `flowrag.config.json` + CLI flags

### Package
`@flowrag/mcp` — standalone MCP server package

### Usage
```bash
npx @flowrag/mcp --data ./data --docs ./content
npx @flowrag/mcp --config ./flowrag.config.json
```

### MCP Tools
- `flowrag_index` — index documents from config docs path
- `flowrag_search` — search the knowledge base (vector + graph dual retrieval)
- `flowrag_trace` — trace data flow upstream/downstream
- `flowrag_path` — find path between entities
- `flowrag_stats` — index statistics
- `flowrag_entities` — list/filter entities
- `flowrag_relations` — get relations for an entity

### MCP Resources
- `flowrag://schema` — current schema definition (entity types, relation types, custom fields)

## 2. Other Planned Features

- ~~**Streaming indexing**~~: Progress callbacks during batch indexing ✅ Complete
- ~~**OpenAI provider**~~: `@flowrag/provider-openai` ✅ Complete
- ~~**Anthropic provider**~~: `@flowrag/provider-anthropic` ✅ Complete
- ~~**Redis storage**~~: `@flowrag/storage-redis` (KV + Vector) ✅ Complete
- **Multi-tenancy**: Namespace support for multi-workspace scenarios

---

*Created: 2026-02-16*
*Status: Planning*
