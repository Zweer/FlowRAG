# TypeScript vs Python for RAG

*February 2026*

## The Elephant in the Room

Search "RAG library" and you'll find Python everywhere. LangChain, LlamaIndex, LightRAG, RAGFlow — all Python. The AI/ML ecosystem grew up in Python, and RAG inherited that.

But here's the thing: **RAG isn't ML**. RAG is plumbing. It's reading files, calling APIs, storing data, and serving results. That's what backend frameworks do. And many backend teams write TypeScript.

## The Case for TypeScript RAG

### Your Stack Is Already TypeScript

If your API is Express/Fastify, your frontend is React/Vue, and your infra is CDK/SST — adding Python for one feature means:

- A separate runtime to manage
- Virtual environments and dependency conflicts
- Different CI/CD pipelines
- Context switching for developers

### Lambda Loves TypeScript

Node.js Lambda functions have faster cold starts than Python. TypeScript bundles are smaller. And you don't need to package numpy, torch, or any heavy ML dependencies — embeddings come from API calls (Gemini, Bedrock) or lightweight ONNX models.

### Type Safety Matters

RAG involves complex data structures: schemas, entities, relations, embeddings, search results. TypeScript catches mistakes at compile time. Python catches them at 3 AM in production.

```typescript
// TypeScript: the compiler tells you this is wrong
const schema = defineSchema({
  entityTypes: ['SERVICE', 'DATABASE'],
  relationTypes: ['USES'],
  entityFields: {
    status: { type: 'enum', values: ['active', 'deprecated'] },
  },
});
```

### npm Ecosystem

Need S3? `@aws-sdk/client-s3`. Need OpenSearch? `@opensearch-project/opensearch`. Need vector search? LanceDB has a Node.js client. The ecosystem is there.

## What Python Does Better

Let's be honest:

- **Model training and fine-tuning**: Python wins, no contest
- **Cutting-edge ML research**: Papers come with Python code
- **Heavy numerical computing**: NumPy/PyTorch are unmatched

But RAG doesn't need any of that. RAG calls an API for embeddings, calls an API for extraction, and stores the results. That's I/O, not computation.

## Our Approach

FlowRAG uses TypeScript end-to-end:

- **Local embeddings**: HuggingFace Transformers.js (ONNX Runtime for Node.js)
- **Cloud embeddings**: Gemini API or AWS Bedrock (HTTP calls)
- **Entity extraction**: LLM API calls with structured output
- **Storage**: SQLite, LanceDB, JSON files, S3, OpenSearch

No Python. No heavy dependencies. Just TypeScript doing what it does best: building reliable, typed, testable backend services.

## The Bottom Line

If your team writes TypeScript and you need RAG, you shouldn't have to learn Python. FlowRAG exists so you don't have to.
