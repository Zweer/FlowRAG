# @flowrag/cli

Command-line interface for FlowRAG — index documents and search from your terminal.

## Installation

```bash
npm install -g @flowrag/cli
```

## Commands

```bash
# Initialize data directory
flowrag init

# Index documents
flowrag index ./content
flowrag index ./content --force          # Re-index all
flowrag index ./content --interactive    # Review entities

# Search
flowrag search "how does OCPP work"
flowrag search "OCPP" --type entities
flowrag search "query" --mode local --limit 20

# Knowledge graph
flowrag graph stats
flowrag graph export

# Statistics
flowrag stats
```

## Configuration

Create `flowrag.json` or `.flowrag.json` in your project root:

```json
{
  "entityTypes": ["SERVICE", "DATABASE", "PROTOCOL"],
  "relationTypes": ["USES", "PRODUCES", "CONSUMES"]
}
```

## License

MIT
