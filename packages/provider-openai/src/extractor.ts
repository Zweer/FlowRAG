import {
  buildExtractionPrompt,
  type ExtractionResult,
  type LLMExtractor,
  type RetryOptions,
  type Schema,
  withRetry,
} from '@flowrag/core';
import OpenAI from 'openai';

import { OpenAILLMModels } from './models.js';

export interface OpenAIExtractorOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  temperature?: number;
  retry?: RetryOptions;
}

export class OpenAIExtractor implements LLMExtractor {
  readonly modelName: string;
  private readonly client: OpenAI;
  private readonly temperature: number;
  private readonly retry: RetryOptions;

  constructor(options: OpenAIExtractorOptions = {}) {
    this.modelName = options.model ?? OpenAILLMModels.GPT_5_MINI;
    this.temperature = options.temperature ?? 0.1;
    this.client = new OpenAI({ apiKey: options.apiKey, baseURL: options.baseURL });
    this.retry = options.retry ?? {};
  }

  async extractEntities(
    content: string,
    knownEntities: string[],
    schema: Schema,
  ): Promise<ExtractionResult> {
    const prompt = buildExtractionPrompt(content, knownEntities, schema);

    const response = await withRetry(
      () =>
        this.client.chat.completions.create({
          model: this.modelName,
          messages: [{ role: 'user', content: prompt }],
          temperature: this.temperature,
          response_format: { type: 'json_object' },
        }),
      this.retry,
    );

    const text = response.choices[0]?.message?.content ?? '';

    try {
      const parsed = JSON.parse(text);
      return {
        ...parsed,
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      throw new Error(`Failed to parse LLM response: ${error}`);
    }
  }
}
