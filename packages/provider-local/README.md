# @flowrag/provider-local

Local AI provider for FlowRAG - ONNX embeddings and future local extraction.

## Installation

```bash
npm install @flowrag/provider-local
```

## Usage

### Embedder

```typescript
import { LocalEmbedder } from '@flowrag/provider-local';

const embedder = new LocalEmbedder({
  model: 'Xenova/e5-small-v2', // optional, default
  dtype: 'q8', // optional: 'fp32', 'q8', 'q4'
  device: 'auto', // optional: 'auto', 'cpu', 'gpu'
});

// Single embedding
const embedding = await embedder.embed('Hello world');

// Batch embeddings
const embeddings = await embedder.embedBatch(['Hello', 'World']);
```

## Supported Models

- `Xenova/e5-small-v2` (384 dims) - Default, fast
- `Xenova/e5-base-v2` (768 dims) - Better quality
- `Xenova/e5-large-v2` (1024 dims) - Best quality
- `Xenova/all-MiniLM-L6-v2` (384 dims) - Compact
- `Xenova/all-mpnet-base-v2` (768 dims) - Good balance

## Reranker

```typescript
import { LocalReranker } from '@flowrag/provider-local';

const reranker = new LocalReranker();
// Uses Xenova/ms-marco-MiniLM-L-6-v2 cross-encoder
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HF_HOME` | Custom cache directory for downloaded models | `node_modules/@huggingface/transformers/.cache/` |

## License

MIT
