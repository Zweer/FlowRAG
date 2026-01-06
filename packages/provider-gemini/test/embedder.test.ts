import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GeminiEmbedder } from '../src/embedder.js';

// Mock @google/genai
vi.mock('@google/genai', () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = {
      embedContent: vi.fn().mockResolvedValue({
        embeddings: [{ values: [0.1, 0.2, 0.3] }],
      }),
    };
  },
}));

describe('GeminiEmbedder', () => {
  let embedder: GeminiEmbedder;

  beforeEach(() => {
    vi.clearAllMocks();
    embedder = new GeminiEmbedder({ apiKey: 'test-key' });
  });

  describe('constructor', () => {
    it('should create with API key', () => {
      expect(embedder.modelName).toBe('text-embedding-004');
      expect(embedder.dimensions).toBe(768);
    });

    it('should throw without API key', () => {
      expect(() => new GeminiEmbedder()).toThrow('Gemini API key is required');
    });

    it('should create with custom model', () => {
      const customEmbedder = new GeminiEmbedder({
        apiKey: 'test-key',
        model: 'custom-model',
      });
      expect(customEmbedder.modelName).toBe('custom-model');
    });
  });

  describe('embed', () => {
    it('should embed single text', async () => {
      const embedding = await embedder.embed('Hello world');
      expect(embedding).toEqual([0.1, 0.2, 0.3]);
    });
  });

  describe('embedBatch', () => {
    it('should embed multiple texts', async () => {
      const embeddings = await embedder.embedBatch(['Hello', 'World']);
      expect(embeddings).toEqual([
        [0.1, 0.2, 0.3],
        [0.1, 0.2, 0.3],
      ]);
    });

    it('should handle empty batch', async () => {
      const embeddings = await embedder.embedBatch([]);
      expect(embeddings).toEqual([]);
    });

    it('should handle undefined embeddings response', async () => {
      const mockEmbedContent = vi.fn().mockResolvedValue({});
      embedder = new GeminiEmbedder({ apiKey: 'test-key' });
      (
        embedder as unknown as { client: { models: { embedContent: unknown } } }
      ).client.models.embedContent = mockEmbedContent;

      const result = await embedder.embed('test');
      expect(result).toEqual([]);
    });

    it('should handle undefined embeddings in batch', async () => {
      const mockEmbedContent = vi.fn().mockResolvedValue({});
      embedder = new GeminiEmbedder({ apiKey: 'test-key' });
      (
        embedder as unknown as { client: { models: { embedContent: unknown } } }
      ).client.models.embedContent = mockEmbedContent;

      const result = await embedder.embedBatch(['test1', 'test2']);
      expect(result).toEqual([[], []]);
    });
  });
});
