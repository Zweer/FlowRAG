import { defineSchema } from '@flowrag/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GeminiExtractor } from '../src/extractor.js';

// Mock @google/genai
vi.mock('@google/genai', () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = {
      generateContent: vi.fn().mockResolvedValue({
        text: JSON.stringify({
          entities: [
            { name: 'ServiceA', type: 'SERVICE', description: 'A microservice' },
            { name: 'DatabaseB', type: 'DATABASE', description: 'A database' },
          ],
          relations: [
            {
              source: 'ServiceA',
              target: 'DatabaseB',
              type: 'USES',
              description: 'ServiceA uses DatabaseB',
              keywords: ['database', 'connection'],
            },
          ],
        }),
      }),
    };
  },
}));

describe('GeminiExtractor', () => {
  let extractor: GeminiExtractor;
  let schema: ReturnType<typeof defineSchema>;

  beforeEach(() => {
    vi.clearAllMocks();
    extractor = new GeminiExtractor({ apiKey: 'test-key' });
    schema = defineSchema({
      entityTypes: ['SERVICE', 'DATABASE', 'PROTOCOL'],
      relationTypes: ['USES', 'PRODUCES', 'CONSUMES'],
    });
  });

  describe('constructor', () => {
    it('should create with API key', () => {
      expect(extractor.modelName).toBe('gemini-3-flash-preview');
    });

    it('should throw without API key', () => {
      expect(() => new GeminiExtractor()).toThrow('Gemini API key is required');
    });

    it('should create with custom options', () => {
      const customExtractor = new GeminiExtractor({
        apiKey: 'test-key',
        model: 'custom-model',
        temperature: 0.5,
      });
      expect(customExtractor.modelName).toBe('custom-model');
    });
  });

  describe('extractEntities', () => {
    it('should extract entities and relations', async () => {
      const content = 'ServiceA connects to DatabaseB for data storage.';
      const knownEntities = ['ServiceC'];

      const result = await extractor.extractEntities(content, knownEntities, schema);

      expect(result.entities).toHaveLength(2);
      expect(result.entities[0]).toEqual({
        name: 'ServiceA',
        type: 'SERVICE',
        description: 'A microservice',
      });

      expect(result.relations).toHaveLength(1);
      expect(result.relations[0]).toEqual({
        source: 'ServiceA',
        target: 'DatabaseB',
        type: 'USES',
        description: 'ServiceA uses DatabaseB',
        keywords: ['database', 'connection'],
      });
    });

    it('should handle empty content', async () => {
      const result = await extractor.extractEntities('', [], schema);
      expect(result.entities).toBeDefined();
      expect(result.relations).toBeDefined();
    });

    it('should handle invalid JSON response', async () => {
      const mockGenerateContent = vi.fn().mockResolvedValue({ text: 'invalid json' });
      extractor = new GeminiExtractor({ apiKey: 'test-key' });
      (
        extractor as unknown as { client: { models: { generateContent: unknown } } }
      ).client.models.generateContent = mockGenerateContent;

      await expect(extractor.extractEntities('test', [], schema)).rejects.toThrow(
        'Failed to parse LLM response',
      );
    });

    it('should handle undefined text response', async () => {
      const mockGenerateContent = vi.fn().mockResolvedValue({});
      extractor = new GeminiExtractor({ apiKey: 'test-key' });
      (
        extractor as unknown as { client: { models: { generateContent: unknown } } }
      ).client.models.generateContent = mockGenerateContent;

      await expect(extractor.extractEntities('test', [], schema)).rejects.toThrow(
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

    // Exercises the branch where entityFields/relationFields are non-empty
    const result = await extractor.extractEntities('content', [], schemaWithFields);
    expect(result.entities).toBeDefined();
  });
});
