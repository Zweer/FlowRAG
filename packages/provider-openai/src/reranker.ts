import {
  type RerankDocument,
  type Reranker,
  type RerankResult,
  type RetryOptions,
  withRetry,
} from '@flowrag/core';
import OpenAI from 'openai';

import { OpenAILLMModels } from './models.js';

export interface OpenAIRerankerOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  retry?: RetryOptions;
}

export class OpenAIReranker implements Reranker {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly retry: RetryOptions;

  constructor(options: OpenAIRerankerOptions = {}) {
    this.model = options.model ?? OpenAILLMModels.GPT_5_MINI;
    this.client = new OpenAI({ apiKey: options.apiKey, baseURL: options.baseURL });
    this.retry = options.retry ?? {};
  }

  async rerank(
    query: string,
    documents: RerankDocument[],
    limit?: number,
  ): Promise<RerankResult[]> {
    if (documents.length === 0) return [];

    const numbered = documents.map((d, i) => `[${i}] ${d.content.slice(0, 500)}`).join('\n\n');

    const response = await withRetry(
      () =>
        this.client.chat.completions.create({
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
        }),
      this.retry,
    );

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
