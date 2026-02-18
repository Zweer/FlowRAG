import type { Embedder } from '@flowrag/core';
import { GoogleGenAI } from '@google/genai';

import { GeminiEmbeddingModels } from './models.js';

export interface GeminiEmbedderOptions {
  apiKey?: string;
  model?: string;
}

export class GeminiEmbedder implements Embedder {
  readonly modelName: string;
  readonly dimensions: number = 768; // text-embedding-004 default
  private readonly client: GoogleGenAI;

  constructor(options: GeminiEmbedderOptions = {}) {
    const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Gemini API key is required. Set GEMINI_API_KEY environment variable or pass apiKey option.',
      );
    }

    this.modelName = options.model || GeminiEmbeddingModels.TEXT_EMBEDDING_004;
    this.client = new GoogleGenAI({ apiKey });
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.models.embedContent({
      model: this.modelName,
      contents: { parts: [{ text }] },
    });
    return response.embeddings?.[0]?.values ?? [];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const results = await Promise.all(
      texts.map((text) =>
        this.client.models.embedContent({
          model: this.modelName,
          contents: { parts: [{ text }] },
        }),
      ),
    );

    return results.map((response) => response.embeddings?.[0]?.values ?? []);
  }
}
