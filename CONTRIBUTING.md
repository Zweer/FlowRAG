# Contributing to FlowRAG

Thanks for your interest in contributing to FlowRAG! 🌊

## Getting Started

```bash
# Clone the repo
git clone https://github.com/Zweer/FlowRAG.git
cd FlowRAG

# Use the correct Node version (recommended)
nvm use

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Run linting
npm run lint
```

### Node.js Version

The repo includes an `.nvmrc` file pinned to **Node 22** (the minimum supported version). We recommend using [nvm](https://github.com/nvm-sh/nvm) to manage Node versions.

If you develop with a newer Node version (e.g., 24), a pre-commit hook automatically regenerates `package-lock.json` for Node 22 compatibility. This requires nvm to be installed. Without nvm, the hook is skipped — CI will catch any lockfile incompatibilities.

## Project Structure

FlowRAG is a monorepo using npm workspaces:

```
packages/
├── core/              # Interfaces, schema, types
├── pipeline/          # Indexing & querying pipelines
├── presets/           # Opinionated presets
├── storage-json/      # JSON file KV storage
├── storage-sqlite/    # SQLite graph & vector storage
├── storage-lancedb/   # LanceDB vector storage
├── storage-s3/        # S3 KV storage
├── storage-opensearch/# OpenSearch vector & graph
├── storage-redis/     # Redis KV & vector
├── provider-local/    # Local ONNX embeddings & reranker
├── provider-gemini/   # Gemini embeddings, extraction, reranker
├── provider-bedrock/  # AWS Bedrock provider
├── provider-openai/   # OpenAI provider
├── provider-anthropic/# Anthropic provider
├── cli/               # CLI
└── mcp/               # MCP server
```

## Development Workflow

1. Create a branch from `main`
2. Make your changes
3. Run `npm test` and `npm run lint`
4. Commit using [Conventional Commits](#commit-messages)
5. Open a pull request

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/) with [Gitmoji](https://gitmoji.dev/):

```
type(scope): :emoji: description
```

Examples:
- `feat(pipeline): :sparkles: add batch processing`
- `fix(storage-sqlite): :bug: fix connection pooling`
- `docs: :memo: update getting started guide`
- `test(core): :white_check_mark: add schema validation tests`

Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `ci`, `build`, `perf`, `test`

Scope: package name when applicable (e.g., `pipeline`, `core`, `storage-json`).

## Code Style

- **TypeScript strict mode** — all parameters and returns typed
- **ES modules** — use `.js` extensions in imports
- **Biome** for linting and formatting — run `npm run lint` before committing
- **camelCase** for all code

## Testing

- **Vitest** for all tests
- **100% coverage** target on all packages
- Mock external services (Gemini, S3, Bedrock, etc.)
- Run `npm test` for unit tests, `npm run test:e2e` for end-to-end

## Adding a New Package

1. Create `packages/<name>/` with `package.json`, `src/index.ts`, `test/`
2. Add to the workspace (automatic via `packages/*` glob)
3. Follow existing package structure for consistency
4. Ensure 100% test coverage

## Questions?

Open a [GitHub Discussion](https://github.com/Zweer/FlowRAG/discussions) or an [issue](https://github.com/Zweer/FlowRAG/issues).
