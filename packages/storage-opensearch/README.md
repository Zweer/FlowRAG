# @flowrag/storage-opensearch

OpenSearch storage for FlowRAG — vector search and knowledge graph on OpenSearch.

## Installation

```bash
npm install @flowrag/storage-opensearch @opensearch-project/opensearch
```

## Usage

```typescript
import { Client } from '@opensearch-project/opensearch';
import { OpenSearchVectorStorage, OpenSearchGraphStorage } from '@flowrag/storage-opensearch';

const client = new Client({ node: 'https://my-domain.es.amazonaws.com' });

const vector = new OpenSearchVectorStorage({ client, dimensions: 384 });
const graph = new OpenSearchGraphStorage({ client });
```

## License

MIT
