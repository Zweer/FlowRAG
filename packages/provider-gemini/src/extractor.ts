import {
  buildExtractionPrompt,
  type ExtractionResult,
  type LLMExtractor,
  type RetryOptions,
  type Schema,
  withRetry,
} from '@flowrag/core';
import { GoogleGenAI } from '@google/genai';

import { GeminiLLMModels } from './models.js';

export interface GeminiExtractorOptions {
  apiKey?: string;
  model?: string;
  temperature?: number;
  retry?: RetryOptions;
}

export class GeminiExtractor implements LLMExtractor {
  readonly modelName: string;
  private readonly client: GoogleGenAI;
  private readonly temperature: number;
  private readonly retry: RetryOptions;

  constructor(options: GeminiExtractorOptions = {}) {
    const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Gemini API key is required. Set GEMINI_API_KEY environment variable or pass apiKey option.',
      );
    }

    this.modelName = options.model || GeminiLLMModels.GEMINI_3_FLASH_PREVIEW;
    this.temperature = options.temperature ?? 0.1;
    this.client = new GoogleGenAI({ apiKey });
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
        this.client.models.generateContent({
          model: this.modelName,
          contents: [{ parts: [{ text: prompt }] }],
          config: {
            temperature: this.temperature,
            responseMimeType: 'application/json',
          },
        }),
      this.retry,
    );

    try {
      return JSON.parse(response.text ?? '');
    } catch (error) {
      throw new Error(`Failed to parse LLM response: ${error}`);
    }
  }
}
