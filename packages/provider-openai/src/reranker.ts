import type { RerankDocument, Reranker, RerankResult } from '@flowrag/core';
import OpenAI from 'openai';

import { OpenAILLMModels } from './models.js';

export interface OpenAIRerankerOptions {
  apiKey?: string;
  model?: string;
}

export class OpenAIReranker implements Reranker {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(options: OpenAIRerankerOptions = {}) {
    this.model = options.model ?? OpenAILLMModels.GPT_5_MINI;
    this.client = new OpenAI({ apiKey: options.apiKey });
  }

  async rerank(
    query: string,
    documents: RerankDocument[],
    limit?: number,
  ): Promise<RerankResult[]> {
    if (documents.length === 0) return [];

    const numbered = documents.map((d, i) => `[${i}] ${d.content.slice(0, 500)}`).join('\n\n');

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'user',
          content: `Given the query: "${query}"

Rank these documents by relevance. Return a JSON array of objects with "index" (original position) and "score" (0-1 relevance).

Documents:
${numbered}

Return JSON array sorted by score descending. Example: [{"index": 2, "score": 0.95}, {"index": 0, "score": 0.7}]`,
        },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    const text = response.choices[0]?.message?.content ?? '[]';
    const parsed = JSON.parse(text);
    const results: { index: number; score: number }[] = Array.isArray(parsed)
      ? parsed
      : (parsed.results ?? parsed.rankings ?? []);
    const top = limit ? results.slice(0, limit) : results;

    return top.map((r) => ({
      id: documents[r.index].id,
      score: r.score,
      index: r.index,
    }));
  }
}
