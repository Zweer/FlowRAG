import { describe, expect, it } from 'vitest';

import {
  BedrockEmbedder,
  BedrockEmbeddingModels,
  BedrockExtractor,
  BedrockLLMModels,
} from '../src/index.js';

describe('provider-bedrock exports', () => {
  it('should export BedrockEmbedder', () => {
    expect(BedrockEmbedder).toBeDefined();
  });

  it('should export BedrockExtractor', () => {
    expect(BedrockExtractor).toBeDefined();
  });

  it('should export BedrockEmbeddingModels', () => {
    expect(BedrockEmbeddingModels.TITAN_EMBED_V2).toBe('amazon.titan-embed-text-v2:0');
    expect(BedrockEmbeddingModels.COHERE_EMBED_ENGLISH_V3).toBe('cohere.embed-english-v3');
    expect(BedrockEmbeddingModels.COHERE_EMBED_MULTILINGUAL_V3).toBe(
      'cohere.embed-multilingual-v3',
    );
  });

  it('should export BedrockLLMModels', () => {
    expect(BedrockLLMModels.CLAUDE_SONNET_4_5).toBe('anthropic.claude-sonnet-4-5-20250929-v1:0');
    expect(BedrockLLMModels.CLAUDE_HAIKU_4_5).toBe('anthropic.claude-haiku-4-5-20251001-v1:0');
    expect(BedrockLLMModels.CLAUDE_OPUS_4_6).toBe('anthropic.claude-opus-4-6-v1');
    expect(BedrockLLMModels.NOVA_LITE).toBe('amazon.nova-lite-v1:0');
    expect(BedrockLLMModels.NOVA_PRO).toBe('amazon.nova-pro-v1:0');
  });
});
