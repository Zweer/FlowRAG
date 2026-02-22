import { type Embedder, type RetryOptions, withRetry } from '@flowrag/core';
import { GoogleGenAI } from '@google/genai';

import { GeminiEmbeddingModels } from './models.js';

export interface GeminiEmbedderOptions {
  apiKey?: string;
  model?: string;
  retry?: RetryOptions;
}

export class GeminiEmbedder implements Embedder {
  readonly modelName: string;
  readonly dimensions: number = 3072; // gemini-embedding-001 default
  private readonly client: GoogleGenAI;
  private readonly retry: RetryOptions;

  constructor(options: GeminiEmbedderOptions = {}) {
    const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Gemini API key is required. Set GEMINI_API_KEY environment variable or pass apiKey option.',
      );
    }

    this.modelName = options.model || GeminiEmbeddingModels.GEMINI_EMBEDDING_001;
    this.client = new GoogleGenAI({ apiKey });
    this.retry = options.retry ?? {};
  }

  async embed(text: string): Promise<number[]> {
    const response = await withRetry(
      () =>
        this.client.models.embedContent({
          model: this.modelName,
          contents: { parts: [{ text }] },
        }),
      this.retry,
    );
    return response.embeddings?.[0]?.values ?? [];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const results = await Promise.all(
      texts.map((text) =>
        withRetry(
          () =>
            this.client.models.embedContent({
              model: this.modelName,
              contents: { parts: [{ text }] },
            }),
          this.retry,
        ),
      ),
    );

    return results.map((response) => response.embeddings?.[0]?.values ?? []);
  }
}
