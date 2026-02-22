import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import {
  buildExtractionPrompt,
  type ExtractionResult,
  type LLMExtractor,
  type RetryOptions,
  type Schema,
  withRetry,
} from '@flowrag/core';

import { BedrockLLMModels } from './models.js';

export interface BedrockExtractorOptions {
  model?: string;
  temperature?: number;
  region?: string;
  retry?: RetryOptions;
}

export class BedrockExtractor implements LLMExtractor {
  readonly modelName: string;
  private readonly client: BedrockRuntimeClient;
  private readonly temperature: number;
  private readonly retry: RetryOptions;

  constructor(options: BedrockExtractorOptions = {}) {
    this.modelName = options.model ?? BedrockLLMModels.CLAUDE_HAIKU_4_5;
    this.temperature = options.temperature ?? 0.1;
    this.client = new BedrockRuntimeClient({
      region: options.region ?? process.env.AWS_REGION ?? 'us-east-1',
    });
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
        this.client.send(
          new ConverseCommand({
            modelId: this.modelName,
            messages: [{ role: 'user', content: [{ text: prompt }] }],
            inferenceConfig: { temperature: this.temperature },
          }),
        ),
      this.retry,
    );

    const text = response.output?.message?.content?.[0]?.text ?? '';

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      throw new Error(`Failed to parse LLM response: ${error}`);
    }
  }
}
