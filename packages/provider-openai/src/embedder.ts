import { type Embedder, type RetryOptions, withRetry } from '@flowrag/core';
import OpenAI from 'openai';

import { OpenAIEmbeddingModels } from './models.js';

export interface OpenAIEmbedderOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  dimensions?: number;
  retry?: RetryOptions;
}

export class OpenAIEmbedder implements Embedder {
  readonly modelName: string;
  readonly dimensions: number;
  private readonly client: OpenAI;
  private readonly retry: RetryOptions;

  constructor(options: OpenAIEmbedderOptions = {}) {
    this.modelName = options.model ?? OpenAIEmbeddingModels.TEXT_EMBEDDING_3_SMALL;
    this.dimensions = options.dimensions ?? 1536;
    this.client = new OpenAI({ apiKey: options.apiKey, baseURL: options.baseURL });
    this.retry = options.retry ?? {};
  }

  async embed(text: string): Promise<number[]> {
    const response = await withRetry(
      () =>
        this.client.embeddings.create({
          model: this.modelName,
          input: text,
          dimensions: this.dimensions,
        }),
      this.retry,
    );
    return response.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const response = await withRetry(
      () =>
        this.client.embeddings.create({
          model: this.modelName,
          input: texts,
          dimensions: this.dimensions,
        }),
      this.retry,
    );
    return response.data.map((d) => d.embedding);
  }
}
