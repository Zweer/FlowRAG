import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LocalEmbedder } from '../src/embedder.js';

// Mock @huggingface/transformers
vi.mock('@huggingface/transformers', () => ({
  pipeline: vi.fn().mockResolvedValue(
    // Mock pipeline function that returns embeddings
    vi.fn().mockResolvedValue({
      data: new Float32Array([0.1, 0.2, 0.3, 0.4]),
    }),
  ),
}));

describe('LocalEmbedder', () => {
  let embedder: LocalEmbedder;

  beforeEach(() => {
    vi.clearAllMocks();
    embedder = new LocalEmbedder({ dtype: 'fp32' });
  });

  describe('constructor', () => {
    it('should create with default options', () => {
      const defaultEmbedder = new LocalEmbedder();
      expect(defaultEmbedder.modelName).toBe('Xenova/e5-small-v2');
      expect(defaultEmbedder.dimensions).toBe(384);
      expect((defaultEmbedder as unknown as { device: string }).device).toBe('auto');
      expect((defaultEmbedder as unknown as { dtype: string }).dtype).toBe('q8');
    });

    it('should create with custom options', () => {
      const customEmbedder = new LocalEmbedder({
        model: 'custom-model',
        dtype: 'fp32',
        device: 'cpu',
      });

      expect(customEmbedder.modelName).toBe('custom-model');
      // Verify device is set (not defaulting to 'auto')
      expect((customEmbedder as unknown as { device: string }).device).toBe('cpu');
    });
  });

  describe('embed', () => {
    it('should embed single text', async () => {
      const text = 'Hello world';
      const embedding = await embedder.embed(text);

      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(4);
      expect(embedding[0]).toBeCloseTo(0.1, 1);
      expect(embedding[1]).toBeCloseTo(0.2, 1);
      expect(embedding[2]).toBeCloseTo(0.3, 1);
      expect(embedding[3]).toBeCloseTo(0.4, 1);
    });

    it('should return consistent embeddings', async () => {
      const text = 'Test text';
      const embedding1 = await embedder.embed(text);
      const embedding2 = await embedder.embed(text);

      expect(embedding1).toEqual(embedding2);
    });
  });

  describe('embedBatch', () => {
    it('should embed multiple texts', async () => {
      const texts = ['Hello', 'World', 'Test'];
      const embeddings = await embedder.embedBatch(texts);

      expect(embeddings).toHaveLength(3);
      expect(embeddings[0][0]).toBeCloseTo(0.1, 1);
      expect(embeddings[1][0]).toBeCloseTo(0.1, 1);
      expect(embeddings[2][0]).toBeCloseTo(0.1, 1);
    });

    it('should handle empty batch', async () => {
      const embeddings = await embedder.embedBatch([]);
      expect(embeddings).toEqual([]);
    });
  });
});
