# FlowRAG MCP — Fargate Deployment

Deploy `@flowrag/mcp` as a centralized HTTP server on AWS Fargate.

## Setup

1. Copy this folder to your deployment repo
2. Edit `flowrag.config.json` with your storage backends and schema
3. Rename `package.json.example` to `package.json` and adjust dependencies for your storage/provider packages
4. Generate a lockfile:

```bash
npm install
```

5. Build the image:

```bash
docker build -t flowrag-mcp .
```

6. Run locally to test:

```bash
docker run -p 3000:3000 \
  -e FLOWRAG_AUTH_TOKEN=my-secret \
  -e AWS_REGION=eu-central-1 \
  flowrag-mcp
```

## Environment Variables

Secrets are passed at runtime via environment variables — **never baked into the image**.

| Variable | Description |
|----------|-------------|
| `FLOWRAG_AUTH_TOKEN` | Bearer token for client authentication |
| `AWS_REGION` | AWS region (for Bedrock, S3, OpenSearch) |
| `GEMINI_API_KEY` | Gemini API key (if using Gemini provider) |

In ECS/Fargate, set these in the task definition (or reference them from Secrets Manager / SSM Parameter Store).

## Client Configuration

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

## Customization

- **Storage backends**: Edit `package.json` dependencies and `flowrag.config.json` storage section. See [Storage Backends](https://flowrag.dev/deployment/remote-mcp#storage-backends) for all options.
- **Providers**: Swap `@flowrag/provider-bedrock` for `@flowrag/provider-gemini` or `@flowrag/provider-openai`.
- **Health check**: The `/health` endpoint returns `{ "status": "ok" }` — use it for your ALB target group.

See the full [Remote MCP Server guide](https://flowrag.dev/deployment/remote-mcp) for architecture details, Fargate tips, and graceful shutdown behavior.
