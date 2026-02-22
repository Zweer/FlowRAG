import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import {
  type RerankDocument,
  type Reranker,
  type RerankResult,
  type RetryOptions,
  withRetry,
} from '@flowrag/core';

import { BedrockRerankerModels } from './models.js';

export interface BedrockRerankerOptions {
  model?: string;
  region?: string;
  retry?: RetryOptions;
}

export class BedrockReranker implements Reranker {
  private readonly client: BedrockRuntimeClient;
  private readonly model: string;
  private readonly retry: RetryOptions;

  constructor(options: BedrockRerankerOptions = {}) {
    this.model = options.model ?? BedrockRerankerModels.RERANK_V1;
    this.client = new BedrockRuntimeClient({
      region: options.region ?? process.env.AWS_REGION ?? 'us-east-1',
    });
    this.retry = options.retry ?? {};
  }

  async rerank(
    query: string,
    documents: RerankDocument[],
    limit?: number,
  ): Promise<RerankResult[]> {
    if (documents.length === 0) return [];

    const body = JSON.stringify({
      query,
      documents: documents.map((d) => ({ textDocument: { text: d.content } })),
      topN: limit ?? documents.length,
    });

    const response = await withRetry(
      () =>
        this.client.send(
          new InvokeModelCommand({ modelId: this.model, body, contentType: 'application/json' }),
        ),
      this.retry,
    );

    const result = JSON.parse(new TextDecoder().decode(response.body));

    return (result.results as { index: number; relevanceScore: number }[]).map((r) => ({
      id: documents[r.index].id,
      score: r.relevanceScore,
      index: r.index,
    }));
  }
}
