import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { defineSchema } from '@flowrag/core';
import { createFlowRAG } from '@flowrag/pipeline';
import { createAWSStorage } from '@flowrag/presets';
import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';

// Define your domain schema
const schema = defineSchema({
  entityTypes: ['SERVICE', 'DATABASE', 'PROTOCOL', 'TEAM'],
  relationTypes: ['USES', 'PRODUCES', 'CONSUMES', 'OWNS'],
});

const region = process.env.AWS_REGION ?? 'eu-central-1';

// Create OpenSearch client with IAM auth (SigV4)
const opensearchClient = new Client({
  ...AwsSigv4Signer({
    region,
    getCredentials: defaultProvider(),
  }),
  node: process.env.OPENSEARCH_ENDPOINT,
});

// Create FlowRAG instance with AWS storage
const rag = createFlowRAG({
  schema,
  ...createAWSStorage({
    bucket: process.env.S3_BUCKET ?? '',
    prefix: process.env.S3_PREFIX ?? 'flowrag/',
    region,
    opensearchClient,
  }),
});

// Lambda handler
interface QueryEvent {
  query: string;
  mode?: 'local' | 'global' | 'hybrid' | 'naive';
  limit?: number;
}

export const handler = async (event: QueryEvent) => {
  const results = await rag.search(event.query, {
    mode: event.mode ?? 'hybrid',
    limit: event.limit ?? 10,
  });

  return {
    statusCode: 200,
    body: JSON.stringify(results),
  };
};
