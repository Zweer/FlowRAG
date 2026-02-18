import { describe, expect, it } from 'vitest';

import {
  OpenAIEmbedder,
  OpenAIEmbeddingModels,
  OpenAIExtractor,
  OpenAILLMModels,
  OpenAIReranker,
} from '../src/index.js';

describe('provider-openai exports', () => {
  it('should export classes', () => {
    expect(OpenAIEmbedder).toBeDefined();
    expect(OpenAIExtractor).toBeDefined();
    expect(OpenAIReranker).toBeDefined();
  });

  it('should export embedding models', () => {
    expect(OpenAIEmbeddingModels.TEXT_EMBEDDING_3_SMALL).toBe('text-embedding-3-small');
    expect(OpenAIEmbeddingModels.TEXT_EMBEDDING_3_LARGE).toBe('text-embedding-3-large');
  });

  it('should export LLM models', () => {
    expect(OpenAILLMModels.GPT_5_MINI).toBe('gpt-5-mini');
    expect(OpenAILLMModels.GPT_5).toBe('gpt-5');
    expect(OpenAILLMModels.GPT_5_2).toBe('gpt-5.2');
  });
});
