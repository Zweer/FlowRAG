import type { RerankDocument, Reranker, RerankResult } from '@flowrag/core';
import { GoogleGenAI } from '@google/genai';

import { GeminiLLMModels } from './models.js';

export interface GeminiRerankerOptions {
  apiKey?: string;
  model?: string;
}

export class GeminiReranker implements Reranker {
  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(options: GeminiRerankerOptions = {}) {
    const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Gemini API key is required. Set GEMINI_API_KEY environment variable or pass apiKey option.',
      );
    }

    this.model = options.model || GeminiLLMModels.GEMINI_3_FLASH_PREVIEW;
    this.client = new GoogleGenAI({ apiKey });
  }

  async rerank(
    query: string,
    documents: RerankDocument[],
    limit?: number,
  ): Promise<RerankResult[]> {
    if (documents.length === 0) return [];

    const numbered = documents.map((d, i) => `[${i}] ${d.content.slice(0, 500)}`).join('\n\n');

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: [
        {
          parts: [
            {
              text: `Given the query: "${query}"

Rank these documents by relevance. Return a JSON array of objects with "index" (original position) and "score" (0-1 relevance).

Documents:
${numbered}

Return JSON array sorted by score descending. Example: [{"index": 2, "score": 0.95}, {"index": 0, "score": 0.7}]`,
            },
          ],
        },
      ],
      config: { temperature: 0, responseMimeType: 'application/json' },
    });

    const results: { index: number; score: number }[] = JSON.parse(response.text ?? '[]');
    const top = limit ? results.slice(0, limit) : results;

    return top.map((r) => ({
      id: documents[r.index].id,
      score: r.score,
      index: r.index,
    }));
  }
}
