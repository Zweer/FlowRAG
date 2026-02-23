# Remote MCP Server

Deploy `@flowrag/mcp` as a centralized HTTP server so multiple AI assistants can share a single knowledge base.

## Architecture

```
┌──────────────┐     ┌──────────────┐
│ Kiro (user A)│     │Claude (user B)│
└──────┬───────┘     └──────┬───────┘
       │    HTTPS           │
       └────────┬───────────┘
                ▼
        ┌───────────────┐
        │  MCP Server   │  Fargate / ECS
        │  (HTTP)       │
        └───────┬───────┘
                │  VPC
    ┌───────────┼───────────┐
    ▼           ▼           ▼
┌───────┐ ┌──────────┐ ┌───────┐
│ Redis │ │OpenSearch │ │Bedrock│
└───────┘ └──────────┘ └───────┘
```

## Server Configuration

Create `flowrag.config.json`:

```json
{
  "data": "./data",
  "docs": "./content",
  "schema": {
    "entityTypes": ["SERVICE", "DATABASE", "PROTOCOL"],
    "relationTypes": ["USES", "PRODUCES", "CONSUMES"]
  },
  "storage": {
    "kv": { "provider": "redis", "url": "redis://redis.internal:6379" },
    "vector": { "provider": "opensearch", "node": "https://os.internal:9200", "dimensions": 1024 },
    "graph": { "provider": "opensearch", "node": "https://os.internal:9200" }
  },
  "embedder": { "provider": "bedrock" },
  "extractor": { "provider": "bedrock" },
  "namespace": "team-docs",
  "transport": "http",
  "port": 3000,
  "auth": {
    "token": "${FLOWRAG_AUTH_TOKEN}"
  }
}
```

Set the token in `.env`:

```bash
FLOWRAG_AUTH_TOKEN=your-secret-token
AWS_REGION=eu-central-1
```

## Client Configuration

Clients just need a URL and token — no local config, no `command`/`args`:

### Kiro (mcp.json)

```json
{
  "mcpServers": {
    "flowrag": {
      "url": "https://flowrag.internal.company.com/mcp",
      "headers": {
        "Authorization": "Bearer ${FLOWRAG_TOKEN}"
      }
    }
  }
}
```

### Claude Desktop

```json
{
  "mcpServers": {
    "flowrag": {
      "url": "https://flowrag.internal.company.com/mcp",
      "headers": {
        "Authorization": "Bearer my-secret-token"
      }
    }
  }
}
```

## Storage Backends

Each storage type can be configured independently. Omitted types fall back to local storage.

### KV Storage

| Provider | Config | Package |
|----------|--------|---------|
| `redis` | `{ "url": "redis://..." }` | `@flowrag/storage-redis` + `redis` |
| `s3` | `{ "bucket": "...", "prefix": "...", "region": "..." }` | `@flowrag/storage-s3` |

### Vector Storage

| Provider | Config | Package |
|----------|--------|---------|
| `opensearch` | `{ "node": "https://...", "dimensions": 1024 }` | `@flowrag/storage-opensearch` + `@opensearch-project/opensearch` |
| `redis` | `{ "url": "redis://...", "dimensions": 384 }` | `@flowrag/storage-redis` + `redis` |

### Graph Storage

| Provider | Config | Package |
|----------|--------|---------|
| `opensearch` | `{ "node": "https://..." }` | `@flowrag/storage-opensearch` + `@opensearch-project/opensearch` |

## Authentication

Bearer token authentication protects all MCP endpoints. The token supports environment variable interpolation:

```json
{ "auth": { "token": "${FLOWRAG_AUTH_TOKEN}" } }
```

Requests without a valid `Authorization: Bearer <token>` header receive a 401 response.

::: tip
For a team-internal server behind a VPC, a bearer token is sufficient. The MCP SDK supports OAuth if you need it later.
:::

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/mcp` | MCP requests (initialize, tool calls) |
| GET | `/mcp` | SSE stream for server-initiated messages |
| DELETE | `/mcp` | Session termination |
| GET | `/health` | Health check (`{ "status": "ok" }`) |

## Docker

```dockerfile
FROM node:24-slim
WORKDIR /app
RUN npm install --no-save \
  @flowrag/mcp \
  @flowrag/storage-redis \
  @flowrag/storage-opensearch \
  @flowrag/provider-bedrock
COPY flowrag.config.json .
COPY .env .
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3000/health').then(r=>{if(!r.ok)throw r})" || exit 1
CMD ["npx", "@flowrag/mcp", "--config", "flowrag.config.json"]
```

Build and run:

```bash
docker build -t flowrag-mcp .
docker run -p 3000:3000 flowrag-mcp
```

## Fargate Deployment

The MCP server is a good fit for Fargate/ECS:

- **Always-on**: No cold starts for users
- **Long-running indexing**: No Lambda 15-minute timeout
- **Connection pooling**: Persistent connections to Redis/OpenSearch
- **SSE streaming**: Native support for progress notifications

Use the health check endpoint (`/health`) for your load balancer target group.

## Graceful Shutdown

The server handles `SIGINT` and `SIGTERM` signals:

1. Stops accepting new connections
2. Closes all active MCP sessions
3. Exits cleanly

ECS sends `SIGTERM` before stopping a task, so sessions are cleaned up properly.

## Namespace

Use the `namespace` field to isolate data for different teams or projects sharing the same storage backends:

```json
{
  "namespace": "team-payments",
  "storage": { ... }
}
```

See [Multi-Tenancy](/guide/multi-tenancy) for details on how namespacing works.
