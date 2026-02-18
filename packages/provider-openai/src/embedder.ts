import type { Embedder } from '@flowrag/core';
import OpenAI from 'openai';

import { OpenAIEmbeddingModels } from './models.js';

export interface OpenAIEmbedderOptions {
  apiKey?: string;
  model?: string;
  dimensions?: number;
}

export class OpenAIEmbedder implements Embedder {
  readonly modelName: string;
  readonly dimensions: number;
  private readonly client: OpenAI;

  constructor(options: OpenAIEmbedderOptions = {}) {
    this.modelName = options.model ?? OpenAIEmbeddingModels.TEXT_EMBEDDING_3_SMALL;
    this.dimensions = options.dimensions ?? 1536;
    this.client = new OpenAI({ apiKey: options.apiKey });
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.modelName,
      input: text,
      dimensions: this.dimensions,
    });
    return response.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const response = await this.client.embeddings.create({
      model: this.modelName,
      input: texts,
      dimensions: this.dimensions,
    });
    return response.data.map((d) => d.embedding);
  }
}
