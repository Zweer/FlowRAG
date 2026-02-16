# @flowrag/provider-gemini

Gemini AI provider for FlowRAG - embeddings and entity extraction.

## Installation

```bash
npm install @flowrag/provider-gemini
```

## Usage

### Embedder

```typescript
import { GeminiEmbedder } from '@flowrag/provider-gemini';

const embedder = new GeminiEmbedder({
  apiKey: 'your-gemini-api-key', // or set GEMINI_API_KEY env var
  model: 'text-embedding-004', // optional, default
});

// Single embedding
const embedding = await embedder.embed('Hello world');

// Batch embeddings
const embeddings = await embedder.embedBatch(['Hello', 'World']);
```

### Extractor

```typescript
import { GeminiExtractor } from '@flowrag/provider-gemini';
import { defineSchema } from '@flowrag/core';

const extractor = new GeminiExtractor({
  apiKey: 'your-gemini-api-key', // or set GEMINI_API_KEY env var
  model: 'gemini-3-flash-preview', // optional, default
  temperature: 0.1, // optional, default
});

const schema = defineSchema({
  entityTypes: ['SERVICE', 'DATABASE'],
  relationTypes: ['USES', 'PRODUCES'],
});

const result = await extractor.extractEntities(
  'ServiceA connects to DatabaseB',
  ['ServiceC'], // known entities
  schema
);
```

## Environment Variables

```bash
GEMINI_API_KEY=your-api-key
```

## License

MIT
