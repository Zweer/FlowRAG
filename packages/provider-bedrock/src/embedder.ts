import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { type Embedder, type RetryOptions, withRetry } from '@flowrag/core';

import { BedrockEmbeddingModels } from './models.js';

export interface BedrockEmbedderOptions {
  model?: string;
  dimensions?: number;
  region?: string;
  retry?: RetryOptions;
  /** Cohere input_type: 'search_document' (indexing) or 'search_query' (querying). Default: 'search_document'. */
  inputType?: 'search_document' | 'search_query';
}

function isCohere(model: string): boolean {
  return model.startsWith('cohere.');
}

export class BedrockEmbedder implements Embedder {
  readonly modelName: string;
  readonly dimensions: number;
  private readonly client: BedrockRuntimeClient;
  private readonly retry: RetryOptions;
  private readonly inputType: string;

  constructor(options: BedrockEmbedderOptions = {}) {
    this.modelName = options.model ?? BedrockEmbeddingModels.TITAN_EMBED_V2;
    this.dimensions = options.dimensions ?? 1024;
    this.client = new BedrockRuntimeClient({
      region: options.region ?? process.env.AWS_REGION ?? 'us-east-1',
    });
    this.retry = options.retry ?? {};
    this.inputType = options.inputType ?? 'search_document';
  }

  async embed(text: string): Promise<number[]> {
    if (isCohere(this.modelName)) {
      const results = await this.embedCohere([text]);
      return results[0];
    }
    return this.embedTitan(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    if (isCohere(this.modelName)) {
      return this.embedCohere(texts);
    }
    return Promise.all(texts.map((text) => this.embedTitan(text)));
  }

  private async embedTitan(text: string): Promise<number[]> {
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

  private async embedCohere(texts: string[]): Promise<number[][]> {
    const body = JSON.stringify({
      texts,
      input_type: this.inputType,
      truncate: 'END',
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
    return result.embeddings;
  }
}
