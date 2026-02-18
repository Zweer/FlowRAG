import {
  buildExtractionPrompt,
  type ExtractionResult,
  type LLMExtractor,
  type Schema,
} from '@flowrag/core';
import OpenAI from 'openai';

import { OpenAILLMModels } from './models.js';

export interface OpenAIExtractorOptions {
  apiKey?: string;
  model?: string;
  temperature?: number;
}

export class OpenAIExtractor implements LLMExtractor {
  readonly modelName: string;
  private readonly client: OpenAI;
  private readonly temperature: number;

  constructor(options: OpenAIExtractorOptions = {}) {
    this.modelName = options.model ?? OpenAILLMModels.GPT_5_MINI;
    this.temperature = options.temperature ?? 0.1;
    this.client = new OpenAI({ apiKey: options.apiKey });
  }

  async extractEntities(
    content: string,
    knownEntities: string[],
    schema: Schema,
  ): Promise<ExtractionResult> {
    const prompt = buildExtractionPrompt(content, knownEntities, schema);

    const response = await this.client.chat.completions.create({
      model: this.modelName,
      messages: [{ role: 'user', content: prompt }],
      temperature: this.temperature,
      response_format: { type: 'json_object' },
    });

    const text = response.choices[0]?.message?.content ?? '';

    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`Failed to parse LLM response: ${error}`);
    }
  }
}
