# FlowRAG MCP Remote Server Requirements

> Specification for adding Streamable HTTP transport, authentication, and remote storage support to `@flowrag/mcp`.

## 1. Overview

### 1.1 Goal

Enable `@flowrag/mcp` to run as a centralized remote server that multiple AI assistants connect to over HTTP, with the knowledge base and storage backends co-located on the same network.

### 1.2 Use Cases

**Local (existing)**: Developer runs MCP server locally via stdio, indexes local files, queries locally.

**Remote (new)**: Team deploys MCP server on Fargate/ECS, storage backends (Redis, OpenSearch, S3) are on the same VPC, multiple users connect via HTTP from their AI assistants.

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
│(KV+Vec)│ │(Vec+Graph)│ │ (AI)  │
└───────┘ └──────────┘ └───────┘
```

### 1.3 Why Fargate over Lambda

- MCP server should be always-on (no cold starts for users)
- Indexing is long-running (Lambda has 15 min timeout)
- Connection pooling to Redis/OpenSearch works better with persistent processes
- SSE streaming for progress works natively

### 1.4 Key Insight

The client config becomes trivial — no `command`, no `args`, just a URL:

```json
{
  "mcpServers": {
    "flowrag": {
      "url": "https://flowrag.company.com/mcp",
      "headers": { "Authorization": "Bearer <token>" }
    }
  }
}
```

The server owns all configuration. The client just connects.

## 2. Configuration Changes

### 2.1 Extended Config File

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

### 2.2 New Config Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `storage` | `object` | — | Remote storage configuration (optional, defaults to local) |
| `storage.kv.provider` | `string` | `"json"` | `"json"`, `"s3"`, `"redis"` |
| `storage.kv.url` | `string` | — | Redis connection URL |
| `storage.kv.bucket` | `string` | — | S3 bucket name |
| `storage.kv.prefix` | `string` | — | S3 key prefix |
| `storage.kv.region` | `string` | — | S3 region |
| `storage.vector.provider` | `string` | `"lancedb"` | `"lancedb"`, `"opensearch"`, `"redis"` |
| `storage.vector.node` | `string` | — | OpenSearch node URL |
| `storage.vector.dimensions` | `number` | — | Vector dimensions (required for OpenSearch/Redis) |
| `storage.vector.url` | `string` | — | Redis connection URL |
| `storage.graph.provider` | `string` | `"sqlite"` | `"sqlite"`, `"opensearch"` |
| `storage.graph.node` | `string` | — | OpenSearch node URL |
| `auth` | `object` | — | Authentication config (optional) |
| `auth.token` | `string` | — | Bearer token (supports `${ENV_VAR}` interpolation) |

### 2.3 Storage Defaults

When `storage` is omitted, the server uses local storage (current behavior):
- KV: JSON files at `{data}/kv/`
- Vector: LanceDB at `{data}/vectors/`
- Graph: SQLite at `{data}/graph.db`

When `storage` is provided, each backend is created from its config.

### 2.4 Auth Token Interpolation

The `auth.token` field supports environment variable interpolation:

```json
{ "auth": { "token": "${FLOWRAG_AUTH_TOKEN}" } }
```

This resolves to `process.env.FLOWRAG_AUTH_TOKEN` at startup. The token itself is never in the config file — only the env var reference.

## 3. Streamable HTTP Transport

### 3.1 Implementation

Uses `StreamableHTTPServerTransport` and `createMcpExpressApp` from `@modelcontextprotocol/sdk` (already available in v1.27).

When `transport: "http"`:
1. Create Express app via `createMcpExpressApp()`
2. Set up POST/GET/DELETE handlers on `/mcp`
3. If `auth.token` is set, add bearer token middleware
4. Listen on `config.port`

### 3.2 Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/mcp` | MCP requests (initialize, tool calls, etc.) |
| GET | `/mcp` | SSE stream for server-initiated messages |
| DELETE | `/mcp` | Session termination |
| GET | `/health` | Health check (returns `{ status: "ok" }`) |

### 3.3 Session Management

Each client connection gets a unique session ID (UUID). Sessions are stored in-memory. On server restart, clients reconnect automatically (MCP protocol handles this).

### 3.4 Graceful Shutdown

On SIGINT/SIGTERM:
1. Stop accepting new connections
2. Close all active transports
3. Exit cleanly

## 4. Authentication

### 4.1 Bearer Token

Simple shared-secret authentication:
- Server config has `auth.token` (resolved from env var)
- Client sends `Authorization: Bearer <token>` header
- Server validates token on every request
- Invalid/missing token → 401 Unauthorized

### 4.2 Why Not OAuth

OAuth adds significant complexity (auth server, token exchange, refresh). For a team-internal MCP server behind a VPC, a bearer token is sufficient. OAuth can be added later as the MCP SDK already supports it.

### 4.3 Middleware

Use a simple Express middleware that checks the `Authorization` header against the configured token. Don't use the SDK's `requireBearerAuth` (which requires an OAuth token verifier) — just a direct string comparison.

## 5. Remote Storage Factory

### 5.1 Factory Extension

Extend `createRagFromConfig` to create remote storage backends from config:

```typescript
function createStorage(config: FlowRAGMcpConfig): StorageSet {
  if (!config.storage) {
    return createLocalStorage(config.data).storage;
  }

  return {
    kv: createKVStorage(config.storage.kv),
    vector: createVectorStorage(config.storage.vector),
    graph: createGraphStorage(config.storage.graph),
  };
}
```

### 5.2 Supported Backends

| Type | Provider | Package | Config |
|------|----------|---------|--------|
| KV | `json` | `@flowrag/storage-json` | `{ path }` |
| KV | `s3` | `@flowrag/storage-s3` | `{ bucket, prefix, region }` |
| KV | `redis` | `@flowrag/storage-redis` | `{ url }` |
| Vector | `lancedb` | `@flowrag/storage-lancedb` | `{ path }` |
| Vector | `opensearch` | `@flowrag/storage-opensearch` | `{ node, dimensions }` |
| Vector | `redis` | `@flowrag/storage-redis` | `{ url, dimensions }` |
| Graph | `sqlite` | `@flowrag/storage-sqlite` | `{ path }` |
| Graph | `opensearch` | `@flowrag/storage-opensearch` | `{ node }` |

### 5.3 Dependencies

Remote storage packages become optional peer dependencies of `@flowrag/mcp`. The factory dynamically imports them:

```typescript
async function createKVStorage(config: KVStorageConfig): Promise<KVStorage> {
  switch (config.provider) {
    case 'redis': {
      const { createClient } = await import('redis');
      const { RedisKVStorage } = await import('@flowrag/storage-redis');
      const client = createClient({ url: config.url });
      await client.connect();
      return new RedisKVStorage({ client });
    }
    // ...
  }
}
```

This way, users only install the storage packages they need.

## 6. Package Changes

### 6.1 `@flowrag/mcp` — New/Modified Files

| File | Change |
|------|--------|
| `src/config.ts` | Add `storage`, `auth` to config interface and defaults |
| `src/factory.ts` | Extend to create remote storage from config |
| `src/server.ts` | Add HTTP transport branch, auth middleware, health endpoint |
| `src/main.ts` | Handle graceful shutdown for HTTP mode |
| `src/auth.ts` | Bearer token validation middleware (new) |

### 6.2 `@flowrag/mcp` — New Dependencies

```json
{
  "peerDependencies": {
    "@flowrag/storage-s3": "workspace:*",
    "@flowrag/storage-opensearch": "workspace:*",
    "@flowrag/storage-redis": "workspace:*",
    "redis": "^5.0.0"
  },
  "peerDependenciesMeta": {
    "@flowrag/storage-s3": { "optional": true },
    "@flowrag/storage-opensearch": { "optional": true },
    "@flowrag/storage-redis": { "optional": true },
    "redis": { "optional": true }
  }
}
```

No new hard dependencies — Express is already a transitive dependency of the MCP SDK.

## 7. Dockerfile

```dockerfile
FROM node:24-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "node_modules/@flowrag/mcp/dist/index.mjs"]
```

Or with the published package:

```dockerfile
FROM node:24-slim
WORKDIR /app
RUN npm install @flowrag/mcp @flowrag/storage-redis @flowrag/storage-opensearch @flowrag/provider-bedrock
COPY flowrag.config.json .
COPY .env .
EXPOSE 3000
CMD ["npx", "@flowrag/mcp", "--config", "flowrag.config.json"]
```

## 8. Client Configuration Examples

### 8.1 Kiro (mcp.json)

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

### 8.2 Claude Desktop

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

## 9. Testing Strategy

- Unit tests for auth middleware (valid token, invalid token, missing token, missing config)
- Unit tests for storage factory (each provider, missing provider, invalid config)
- Unit tests for HTTP transport setup (mock Express app)
- Unit tests for config loading with `storage` and `auth` fields
- Unit tests for env var interpolation in auth token
- Unit tests for graceful shutdown
- 100% coverage target

## 10. Development Phases

### Phase 1: Config & Auth
- [x] Extend config interface with `storage` and `auth` fields
- [x] Env var interpolation for `auth.token`
- [x] Bearer token auth middleware (`auth.ts`)
- [x] Tests

### Phase 2: HTTP Transport
- [x] Streamable HTTP transport in `server.ts`
- [x] Health check endpoint
- [x] Session management
- [x] Graceful shutdown in `main.ts`
- [x] Tests

### Phase 3: Remote Storage Factory
- [x] Extend `factory.ts` with remote storage creation
- [x] Dynamic imports for optional storage packages
- [x] Tests

### Phase 4: Deployment
- [x] Dockerfile
- [x] VitePress docs page (`docs/deployment/remote-mcp.md`)
- [x] Client configuration examples (Kiro, Claude Desktop)
- [x] Update main README

## 11. Success Criteria

1. `npx @flowrag/mcp --config config.json` starts an HTTP server with bearer auth
2. AI assistants connect via URL + token and can index/search/explore the knowledge graph
3. Remote storage backends (Redis, OpenSearch, S3) work from config
4. Graceful shutdown on SIGINT/SIGTERM
5. 100% test coverage
6. Dockerfile ready for Fargate deployment

---

*Created: 2026-02-23*
*Status: Complete*
