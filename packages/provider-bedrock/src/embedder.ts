import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { type Embedder, type RetryOptions, withRetry } from '@flowrag/core';

import { BedrockEmbeddingModels } from './models.js';

export interface BedrockEmbedderOptions {
  model?: string;
  dimensions?: number;
  region?: string;
  retry?: RetryOptions;
}

export class BedrockEmbedder implements Embedder {
  readonly modelName: string;
  readonly dimensions: number;
  private readonly client: BedrockRuntimeClient;
  private readonly retry: RetryOptions;

  constructor(options: BedrockEmbedderOptions = {}) {
    this.modelName = options.model ?? BedrockEmbeddingModels.TITAN_EMBED_V2;
    this.dimensions = options.dimensions ?? 1024;
    this.client = new BedrockRuntimeClient({
      region: options.region ?? process.env.AWS_REGION ?? 'us-east-1',
    });
    this.retry = options.retry ?? {};
  }

  async embed(text: string): Promise<number[]> {
    const body = JSON.stringify({
      inputText: text,
      dimensions: this.dimensions,
    });

    const response = await withRetry(
      () =>
        this.client.send(
          new InvokeModelCommand({
            modelId: this.modelName,
            body,
            contentType: 'application/json',
          }),
        ),
      this.retry,
    );

    const result = JSON.parse(new TextDecoder().decode(response.body));
    return result.embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    return Promise.all(texts.map((text) => this.embed(text)));
  }
}
