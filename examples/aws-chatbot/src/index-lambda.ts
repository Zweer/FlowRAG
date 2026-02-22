import { join } from 'node:path';

import { defineSchema } from '@flowrag/core';
import { createFlowRAG } from '@flowrag/pipeline';
import { createAWSStorage } from '@flowrag/presets';
import { Client } from '@opensearch-project/opensearch';
import type { Context } from 'aws-lambda';

/**
 * Index Lambda — triggered daily by EventBridge or manually.
 *
 * Reads documents from S3 source bucket, indexes them into
 * FlowRAG (S3 KV + OpenSearch Vector/Graph + Bedrock AI).
 *
 * Environment variables:
 *   DOCS_BUCKET    — S3 bucket with source documents
 *   DATA_BUCKET    — S3 bucket for FlowRAG KV storage
 *   OPENSEARCH_URL — OpenSearch domain endpoint
 *   AWS_REGION     — AWS region
 */

const schema = defineSchema({
  entityTypes: ['SERVICE', 'DATABASE', 'TEAM', 'TOOL', 'PROTOCOL', 'POLICY', 'PROCESS'],
  relationTypes: ['USES', 'OWNS', 'PRODUCES', 'CONSUMES', 'DEPENDS_ON', 'MANAGES', 'FOLLOWS'],
});

function createRag() {
  const osClient = new Client({ node: process.env.OPENSEARCH_URL });
  const dataBucket = process.env.DATA_BUCKET;
  if (!dataBucket) throw new Error('DATA_BUCKET env var required');

  return createFlowRAG({
    schema,
    ...createAWSStorage({
      bucket: dataBucket,
      opensearchClient: osClient,
      region: process.env.AWS_REGION,
    }),
    options: {
      indexing: {
        maxParallelInsert: 5,
        llmMaxAsync: 10,
        embeddingMaxAsync: 20,
        extractionGleanings: 1, // one extra pass for better accuracy
      },
    },
  });
}

export async function handler(_event: unknown, _context: Context) {
  const rag = createRag();

  // Download docs from S3 source bucket to /tmp
  // (In production, use a proper S3 sync or list+get approach)
  const docsPath = '/tmp/docs';
  const docsBucket = process.env.DOCS_BUCKET;
  if (!docsBucket) throw new Error('DOCS_BUCKET env var required');
  await downloadDocs(docsBucket, docsPath);

  // Index all documents — unchanged ones are skipped automatically
  await rag.index(docsPath, {
    onProgress: (event) => {
      if (event.type === 'done') {
        console.log(
          `Indexed: ${event.documentsProcessed}/${event.documentsTotal} docs, ${event.chunksProcessed} chunks`,
        );
      }
    },
  });

  const stats = await rag.stats();
  console.log('Stats:', JSON.stringify(stats));

  return { statusCode: 200, body: JSON.stringify(stats) };
}

/**
 * Download all documents from S3 to a local directory.
 * Simplified — in production, use paginated ListObjectsV2 + GetObject.
 */
async function downloadDocs(bucket: string, destPath: string) {
  const { S3Client, ListObjectsV2Command, GetObjectCommand } = await import('@aws-sdk/client-s3');
  const { mkdir, writeFile } = await import('node:fs/promises');

  const s3 = new S3Client({});
  await mkdir(destPath, { recursive: true });

  const list = await s3.send(new ListObjectsV2Command({ Bucket: bucket }));

  for (const obj of list.Contents ?? []) {
    if (!obj.Key) continue;
    const resp = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: obj.Key }));
    const body = await resp.Body?.transformToString();
    if (body) {
      const filePath = join(destPath, obj.Key);
      await mkdir(join(destPath, obj.Key, '..'), { recursive: true });
      await writeFile(filePath, body);
    }
  }
}
