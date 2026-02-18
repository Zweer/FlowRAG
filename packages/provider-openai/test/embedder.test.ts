import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OpenAIEmbedder } from '../src/embedder.js';
import { OpenAIEmbeddingModels } from '../src/models.js';

const mockCreate = vi.fn();

vi.mock('openai', () => ({
  default: class {
    embeddings = { create: mockCreate };
  },
}));

describe('OpenAIEmbedder', () => {
  let embedder: OpenAIEmbedder;

  beforeEach(() => {
    vi.clearAllMocks();
    embedder = new OpenAIEmbedder({ apiKey: 'test-key' });
  });

  describe('constructor', () => {
    it('should use text-embedding-3-small by default', () => {
      expect(embedder.modelName).toBe(OpenAIEmbeddingModels.TEXT_EMBEDDING_3_SMALL);
      expect(embedder.dimensions).toBe(1536);
    });

    it('should accept custom model and dimensions', () => {
      const custom = new OpenAIEmbedder({
        apiKey: 'k',
        model: 'text-embedding-3-large',
        dimensions: 3072,
      });
      expect(custom.modelName).toBe('text-embedding-3-large');
      expect(custom.dimensions).toBe(3072);
    });
  });

  describe('embed', () => {
    it('should return embedding vector', async () => {
      mockCreate.mockResolvedValue({ data: [{ embedding: [0.1, 0.2, 0.3] }] });
      const result = await embedder.embed('hello');
      expect(result).toEqual([0.1, 0.2, 0.3]);
    });
  });

  describe('embedBatch', () => {
    it('should embed multiple texts in one call', async () => {
      mockCreate.mockResolvedValue({
        data: [{ embedding: [0.1] }, { embedding: [0.2] }],
      });
      const result = await embedder.embedBatch(['a', 'b']);
      expect(result).toEqual([[0.1], [0.2]]);
    });

    it('should return empty for empty input', async () => {
      const result = await embedder.embedBatch([]);
      expect(result).toEqual([]);
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });
});
