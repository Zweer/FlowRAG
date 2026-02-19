import { defineSchema } from '@flowrag/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OpenAIExtractor } from '../src/extractor.js';
import { OpenAILLMModels } from '../src/models.js';

const mockCreate = vi.fn();
const mockConstructor = vi.fn();

vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: mockCreate } };
    constructor(opts: unknown) {
      mockConstructor(opts);
    }
  },
}));

const extraction = {
  entities: [{ name: 'ServiceA', type: 'SERVICE', description: 'A service' }],
  relations: [
    { source: 'ServiceA', target: 'DB', type: 'USES', description: 'uses', keywords: ['db'] },
  ],
};

describe('OpenAIExtractor', () => {
  let extractor: OpenAIExtractor;
  const schema = defineSchema({
    entityTypes: ['SERVICE', 'DATABASE'],
    relationTypes: ['USES'],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    extractor = new OpenAIExtractor({ apiKey: 'test-key' });
  });

  describe('constructor', () => {
    it('should use gpt-5-mini by default', () => {
      expect(extractor.modelName).toBe(OpenAILLMModels.GPT_5_MINI);
    });

    it('should accept custom options', () => {
      const custom = new OpenAIExtractor({ model: 'gpt-5', temperature: 0.5 });
      expect(custom.modelName).toBe('gpt-5');
    });

    it('should pass baseURL to OpenAI client', () => {
      new OpenAIExtractor({ apiKey: 'k', baseURL: 'http://localhost:11434/v1' });
      expect(mockConstructor).toHaveBeenCalledWith({
        apiKey: 'k',
        baseURL: 'http://localhost:11434/v1',
      });
    });
  });

  describe('extractEntities', () => {
    it('should extract entities and relations', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(extraction) } }],
      });

      const result = await extractor.extractEntities('content', [], schema);
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].name).toBe('ServiceA');
      expect(result.relations).toHaveLength(1);
    });

    it('should throw on invalid JSON', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'not json' } }],
      });

      await expect(extractor.extractEntities('content', [], schema)).rejects.toThrow(
        'Failed to parse LLM response',
      );
    });

    it('should handle empty response', async () => {
      mockCreate.mockResolvedValue({ choices: [{ message: {} }] });

      await expect(extractor.extractEntities('content', [], schema)).rejects.toThrow(
        'Failed to parse LLM response',
      );
    });

    it('should include token usage when available', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(extraction) } }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      });

      const result = await extractor.extractEntities('content', [], schema);
      expect(result.usage).toEqual({
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      });
    });
  });
});
