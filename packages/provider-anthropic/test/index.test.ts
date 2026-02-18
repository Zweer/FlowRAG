import { describe, expect, it } from 'vitest';

import { AnthropicExtractor, AnthropicLLMModels, AnthropicReranker } from '../src/index.js';

describe('provider-anthropic exports', () => {
  it('should export classes', () => {
    expect(AnthropicExtractor).toBeDefined();
    expect(AnthropicReranker).toBeDefined();
  });

  it('should export LLM models', () => {
    expect(AnthropicLLMModels.CLAUDE_OPUS_4_6).toBe('claude-opus-4-6');
    expect(AnthropicLLMModels.CLAUDE_SONNET_4_6).toBe('claude-sonnet-4-6');
    expect(AnthropicLLMModels.CLAUDE_HAIKU_4_5).toBe('claude-haiku-4-5-20251001');
  });
});
