# CLI Reference

`@flowrag/cli` provides a command-line interface for local usage.

## Installation

```bash
npm install -g @flowrag/cli
```

## Commands

### `flowrag init`

Initialize the data directory:

```bash
flowrag init
flowrag init --data /custom/path
```

### `flowrag index`

Index documents from a directory:

```bash
flowrag index <path> [options]
```

| Option | Description |
|--------|-------------|
| `-d, --data <path>` | Data storage path (default: `./data`) |
| `-f, --force` | Re-index all documents (ignore hashes) |
| `-i, --interactive` | Review extracted entities interactively |

Examples:

```bash
flowrag index ./content                    # Incremental index
flowrag index ./content --force            # Re-index everything
flowrag index ./content --interactive      # Review entities
flowrag index ./content --data /tmp/mydata # Custom data path
```

### `flowrag search`

Search the indexed knowledge base:

```bash
flowrag search <query> [options]
```

| Option | Description |
|--------|-------------|
| `--type <type>` | Search type: `chunks`, `entities` (semantic), `relations` |
| `--mode <mode>` | Query mode: `hybrid`, `local`, `global`, `naive` |
| `--limit <n>` | Max results (default: 10) |
| `-d, --data <path>` | Data storage path (default: `./data`) |

Examples:

```bash
flowrag search "how does OCPP work"
flowrag search "OCPP" --type entities
flowrag search "ServiceA" --type relations
flowrag search "query" --mode local --limit 20
```

### `flowrag stats`

Show index statistics:

```bash
flowrag stats
flowrag stats --data /custom/path
```

### `flowrag graph`

Knowledge graph operations:

```bash
flowrag graph stats                # Entity/relation breakdown
flowrag graph export               # Export as DOT format
flowrag graph export --format dot  # Explicit DOT format
```

## Interactive Mode

When indexing with `--interactive`, you review each extraction:

```
📄 Chunk chunk:abc123 — doc:readme

? Entities — select to keep:
  ◉ [SERVICE]  becky-ocpp16 — "Backend OCPP 1.6..."
  ◉ [PROTOCOL] OCPP 1.6 — "Open Charge Point Protocol..."
  ◯ [OTHER]    WebSocket — "Communication protocol..."

? What next?
  → Continue to relations
    ✏️  Edit an entity
    ➕ Add new entity
    📄 Show chunk content
```

You can accept, reject, edit entities, or add new ones before they're stored.
