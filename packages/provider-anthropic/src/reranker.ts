import Anthropic from '@anthropic-ai/sdk';
import type { RerankDocument, Reranker, RerankResult } from '@flowrag/core';

import { AnthropicLLMModels } from './models.js';

export interface AnthropicRerankerOptions {
  apiKey?: string;
  model?: string;
}

export class AnthropicReranker implements Reranker {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(options: AnthropicRerankerOptions = {}) {
    this.model = options.model ?? AnthropicLLMModels.CLAUDE_HAIKU_4_5;
    this.client = new Anthropic({ apiKey: options.apiKey });
  }

  async rerank(
    query: string,
    documents: RerankDocument[],
    limit?: number,
  ): Promise<RerankResult[]> {
    if (documents.length === 0) return [];

    const numbered = documents.map((d, i) => `[${i}] ${d.content.slice(0, 500)}`).join('\n\n');

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      temperature: 0,
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
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '[]';

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const results: { index: number; score: number }[] = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    const top = limit ? results.slice(0, limit) : results;

    return top.map((r) => ({
      id: documents[r.index].id,
      score: r.score,
      index: r.index,
    }));
  }
}
