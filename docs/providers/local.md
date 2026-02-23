# Local Provider (ONNX)

`@flowrag/provider-local` runs AI models entirely offline using ONNX Runtime and HuggingFace Transformers.js. No API keys, no network, no cost.

## Installation

```bash
npm install @flowrag/provider-local
```

## Embedder

```typescript
import { LocalEmbedder } from '@flowrag/provider-local';

const embedder = new LocalEmbedder({
  model: 'Xenova/e5-small-v2',  // default
  dtype: 'q8',                   // fp32, q8, q4
});

embedder.dimensions; // 384
embedder.modelName;  // 'Xenova/e5-small-v2'
```

Models are downloaded and cached on first use.

## Reranker

```typescript
import { LocalReranker } from '@flowrag/provider-local';

const reranker = new LocalReranker();
// Uses Xenova/ms-marco-MiniLM-L-6-v2 cross-encoder
```

## Notes

- First run downloads models (~30-100MB depending on model and quantization)
- Subsequent runs use cached models
- `q8` quantization offers a good balance of speed and accuracy
- No LLM extractor available locally — pair with Gemini or Bedrock for extraction
- Set `HF_HOME` to customize the model cache directory (defaults to inside `node_modules`)
