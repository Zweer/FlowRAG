# @flowrag/storage-s3

S3 KV storage for FlowRAG — store documents, chunks, and cache on Amazon S3.

## Installation

```bash
npm install @flowrag/storage-s3 @aws-sdk/client-s3
```

## Usage

```typescript
import { S3Client } from '@aws-sdk/client-s3';
import { S3KVStorage } from '@flowrag/storage-s3';

const kv = new S3KVStorage({
  client: new S3Client({ region: 'eu-central-1' }),
  bucket: 'my-rag-bucket',
  prefix: 'kv/',
});

await kv.set('doc:readme', { content: 'Hello world' });
const doc = await kv.get('doc:readme');
const keys = await kv.list('doc:');
```

## License

MIT
