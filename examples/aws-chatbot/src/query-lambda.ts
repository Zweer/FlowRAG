import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { defineSchema } from '@flowrag/core';
import { createFlowRAG } from '@flowrag/pipeline';
import { createAWSStorage } from '@flowrag/presets';
import { Client } from '@opensearch-project/opensearch';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Query Lambda — behind API Gateway, handles chat requests.
 *
 * Flow: question → FlowRAG search → Bedrock generates answer → response with citations
 *
 * Environment variables:
 *   DATA_BUCKET    — S3 bucket for FlowRAG KV storage
 *   OPENSEARCH_URL — OpenSearch domain endpoint
 *   AWS_REGION     — AWS region
 */

const schema = defineSchema({
  entityTypes: ['SERVICE', 'DATABASE', 'TEAM', 'TOOL', 'PROTOCOL', 'POLICY', 'PROCESS'],
  relationTypes: ['USES', 'OWNS', 'PRODUCES', 'CONSUMES', 'DEPENDS_ON', 'MANAGES', 'FOLLOWS'],
});

// Initialize once (reused across Lambda invocations)
const osClient = new Client({ node: process.env.OPENSEARCH_URL });
const bedrock = new BedrockRuntimeClient({});

const rag = createFlowRAG({
  schema,
  ...createAWSStorage({
    bucket: process.env.DATA_BUCKET!,
    opensearchClient: osClient,
    region: process.env.AWS_REGION,
  }),
});

interface ChatRequest {
  question: string;
  mode?: 'hybrid' | 'local' | 'global' | 'naive';
}

interface ChatResponse {
  answer: string;
  sources: Array<{ documentId: string; filePath?: string; chunkIndex: number }>;
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body: ChatRequest = JSON.parse(event.body ?? '{}');

    if (!body.question) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing "question" field' }) };
    }

    // 1. Retrieve relevant context via FlowRAG
    const results = await rag.search(body.question, {
      mode: body.mode ?? 'hybrid',
      limit: 5,
    });

    if (results.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          answer: "I couldn't find relevant information in the documentation.",
          sources: [],
        }),
      };
    }

    // 2. Build context with citations
    const context = results
      .map((r, i) => {
        const source = r.sources[0];
        const ref = source?.filePath ?? source?.documentId ?? 'unknown';
        return `[${i + 1}] (from ${ref})\n${r.content}`;
      })
      .join('\n\n---\n\n');

    // 3. Generate answer via Bedrock (Claude)
    const answer = await generateAnswer(body.question, context);

    // 4. Collect unique sources
    const sources = results.flatMap((r) => r.sources);

    const response: ChatResponse = { answer, sources };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Chat error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
}

async function generateAnswer(question: string, context: string): Promise<string> {
  const response = await bedrock.send(
    new InvokeModelCommand({
      modelId: 'anthropic.claude-haiku-4-5-20251001-v1:0',
      contentType: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1024,
        system: `You are a helpful assistant that answers questions about company documentation.
Answer ONLY based on the provided context. Cite sources using [1], [2], etc.
Be concise and direct. If the context doesn't contain the answer, say so.`,
        messages: [
          {
            role: 'user',
            content: `Context:\n${context}\n\nQuestion: ${question}`,
          },
        ],
      }),
    }),
  );

  const result = JSON.parse(new TextDecoder().decode(response.body));
  return result.content[0].text;
}
