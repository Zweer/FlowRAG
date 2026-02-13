import { defineSchema } from '@flowrag/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BedrockExtractor } from '../src/extractor.js';
import { BedrockLLMModels } from '../src/models.js';

const mockSend = vi.fn();

vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: class {
    send = mockSend;
  },
  ConverseCommand: class {
    constructor(public input: unknown) {}
  },
}));

const extraction = {
  entities: [{ name: 'ServiceA', type: 'SERVICE', description: 'A service' }],
  relations: [
    {
      source: 'ServiceA',
      target: 'DB',
      type: 'USES',
      description: 'uses',
      keywords: ['db'],
    },
  ],
};

describe('BedrockExtractor', () => {
  let extractor: BedrockExtractor;
  const schema = defineSchema({
    entityTypes: ['SERVICE', 'DATABASE'],
    relationTypes: ['USES', 'PRODUCES'],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    extractor = new BedrockExtractor();
  });

  describe('constructor', () => {
    it('should use Claude Haiku 4.5 by default', () => {
      expect(extractor.modelName).toBe(BedrockLLMModels.CLAUDE_HAIKU_4_5);
    });

    it('should accept custom options', () => {
      const custom = new BedrockExtractor({
        model: 'amazon.nova-lite-v1:0',
        temperature: 0.5,
        region: 'eu-central-1',
      });
      expect(custom.modelName).toBe('amazon.nova-lite-v1:0');
    });
  });

  describe('extractEntities', () => {
    it('should extract entities and relations', async () => {
      mockSend.mockResolvedValue({
        output: {
          message: { content: [{ text: JSON.stringify(extraction) }] },
        },
      });

      const result = await extractor.extractEntities('content', ['Known'], schema);
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].name).toBe('ServiceA');
      expect(result.relations).toHaveLength(1);
    });

    it('should extract JSON from surrounding text', async () => {
      mockSend.mockResolvedValue({
        output: {
          message: {
            content: [{ text: `Here is the result:\n${JSON.stringify(extraction)}\nDone.` }],
          },
        },
      });

      const result = await extractor.extractEntities('content', [], schema);
      expect(result.entities).toHaveLength(1);
    });

    it('should throw on invalid JSON', async () => {
      mockSend.mockResolvedValue({
        output: { message: { content: [{ text: 'no json here' }] } },
      });

      await expect(extractor.extractEntities('content', [], schema)).rejects.toThrow(
        'Failed to parse LLM response',
      );
    });

    it('should throw on empty response', async () => {
      mockSend.mockResolvedValue({ output: {} });

      await expect(extractor.extractEntities('content', [], schema)).rejects.toThrow(
        'Failed to parse LLM response',
      );
    });
  });

  it('should include custom fields in prompt when schema has them', async () => {
    const schemaWithFields = defineSchema({
      entityTypes: ['SERVICE'] as const,
      relationTypes: ['USES'] as const,
      entityFields: { status: { type: 'enum', values: ['active', 'deprecated'] } },
      relationFields: { syncType: { type: 'string' } },
    });

    mockSend.mockResolvedValue({
      output: { message: { content: [{ text: JSON.stringify(extraction) }] } },
    });

    await extractor.extractEntities('content', [], schemaWithFields);

    const call = mockSend.mock.calls[0][0];
    const prompt = call.input.messages[0].content[0].text;
    expect(prompt).toContain('Entity custom fields');
    expect(prompt).toContain('Relation custom fields');
    expect(prompt).toContain('"fields": {}');
  });
});
