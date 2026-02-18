import { defineSchema } from '@flowrag/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AnthropicExtractor } from '../src/extractor.js';
import { AnthropicLLMModels } from '../src/models.js';

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: mockCreate };
  },
}));

const extraction = {
  entities: [{ name: 'ServiceA', type: 'SERVICE', description: 'A service' }],
  relations: [
    { source: 'ServiceA', target: 'DB', type: 'USES', description: 'uses', keywords: ['db'] },
  ],
};

describe('AnthropicExtractor', () => {
  let extractor: AnthropicExtractor;
  const schema = defineSchema({
    entityTypes: ['SERVICE', 'DATABASE'],
    relationTypes: ['USES'],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    extractor = new AnthropicExtractor({ apiKey: 'test-key' });
  });

  describe('constructor', () => {
    it('should use Claude Haiku 4.5 by default', () => {
      expect(extractor.modelName).toBe(AnthropicLLMModels.CLAUDE_HAIKU_4_5);
    });

    it('should accept custom options', () => {
      const custom = new AnthropicExtractor({ model: 'claude-opus-4-6', temperature: 0.5 });
      expect(custom.modelName).toBe('claude-opus-4-6');
    });
  });

  describe('extractEntities', () => {
    it('should extract entities and relations', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(extraction) }],
      });

      const result = await extractor.extractEntities('content', [], schema);
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].name).toBe('ServiceA');
      expect(result.relations).toHaveLength(1);
    });

    it('should extract JSON from surrounding text', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: `Here:\n${JSON.stringify(extraction)}\nDone.` }],
      });

      const result = await extractor.extractEntities('content', [], schema);
      expect(result.entities).toHaveLength(1);
    });

    it('should throw on invalid JSON', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'no json here' }],
      });

      await expect(extractor.extractEntities('content', [], schema)).rejects.toThrow(
        'Failed to parse LLM response',
      );
    });

    it('should handle non-text content block', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'tool_use', id: 'x' }],
      });

      await expect(extractor.extractEntities('content', [], schema)).rejects.toThrow(
        'Failed to parse LLM response',
      );
    });
  });
});
