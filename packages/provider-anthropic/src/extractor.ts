import Anthropic from '@anthropic-ai/sdk';
import {
  buildExtractionPrompt,
  type ExtractionResult,
  type LLMExtractor,
  type Schema,
} from '@flowrag/core';

import { AnthropicLLMModels } from './models.js';

export interface AnthropicExtractorOptions {
  apiKey?: string;
  model?: string;
  temperature?: number;
}

export class AnthropicExtractor implements LLMExtractor {
  readonly modelName: string;
  private readonly client: Anthropic;
  private readonly temperature: number;

  constructor(options: AnthropicExtractorOptions = {}) {
    this.modelName = options.model ?? AnthropicLLMModels.CLAUDE_HAIKU_4_5;
    this.temperature = options.temperature ?? 0.1;
    this.client = new Anthropic({ apiKey: options.apiKey });
  }

  async extractEntities(
    content: string,
    knownEntities: string[],
    schema: Schema,
  ): Promise<ExtractionResult> {
    const prompt = buildExtractionPrompt(content, knownEntities, schema);

    const response = await this.client.messages.create({
      model: this.modelName,
      max_tokens: 4096,
      temperature: this.temperature,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      throw new Error(`Failed to parse LLM response: ${error}`);
    }
  }
}
