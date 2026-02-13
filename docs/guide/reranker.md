# Reranker

Reranking is an optional post-retrieval step that re-scores results using a more sophisticated model, improving relevance at the cost of slightly higher latency.

## How It Works

```
Query → Retrieve (vector + graph) → Rerank → Final Results
```

Without a reranker, results are ranked by embedding similarity and graph scores. With a reranker, a cross-encoder or LLM evaluates each result against the query for more accurate scoring.

## Setup

Add a reranker to your FlowRAG config:

```typescript
import { LocalReranker } from '@flowrag/provider-local';

const rag = createFlowRAG({
  schema,
  ...createLocalStorage('./data'),
  reranker: new LocalReranker(),
});
```

The reranker is applied automatically to all query modes (`hybrid`, `local`, `global`, `naive`).

## Implementations

### Local (ONNX)

Runs entirely offline using a cross-encoder model:

```typescript
import { LocalReranker } from '@flowrag/provider-local';

const reranker = new LocalReranker();
// Uses Xenova/ms-marco-MiniLM-L-6-v2 via ONNX
```

**Pros**: No API key, no network, fast, free  
**Cons**: Less accurate than larger models

### Gemini

LLM-based relevance scoring:

```typescript
import { GeminiReranker } from '@flowrag/provider-gemini';

const reranker = new GeminiReranker();
// Requires GEMINI_API_KEY
```

**Pros**: High accuracy, understands nuance  
**Cons**: Requires API key, higher latency, cost per query

### AWS Bedrock

Amazon Rerank API:

```typescript
import { BedrockReranker } from '@flowrag/provider-bedrock';

const reranker = new BedrockReranker();
// Uses amazon.rerank-v1:0
```

**Pros**: Managed service, good accuracy, AWS integration  
**Cons**: Requires AWS credentials, cost per query

## When to Use a Reranker

- **Use it** when result quality matters more than latency
- **Skip it** for simple lookups or when speed is critical
- **Start without** and add one if results aren't relevant enough
