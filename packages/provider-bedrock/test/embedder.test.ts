import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BedrockEmbedder } from '../src/embedder.js';
import { BedrockEmbeddingModels } from '../src/models.js';

const mockSend = vi.fn();

vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: class {
    send = mockSend;
  },
  InvokeModelCommand: class {
    constructor(public input: unknown) {}
  },
}));

describe('BedrockEmbedder', () => {
  let embedder: BedrockEmbedder;

  beforeEach(() => {
    vi.clearAllMocks();
    embedder = new BedrockEmbedder();
  });

  describe('constructor', () => {
    it('should use Titan Embed V2 by default', () => {
      expect(embedder.modelName).toBe(BedrockEmbeddingModels.TITAN_EMBED_V2);
      expect(embedder.dimensions).toBe(1024);
    });

    it('should accept custom model and dimensions', () => {
      const custom = new BedrockEmbedder({
        model: 'cohere.embed-english-v3',
        dimensions: 512,
        region: 'eu-central-1',
      });
      expect(custom.modelName).toBe('cohere.embed-english-v3');
      expect(custom.dimensions).toBe(512);
    });
  });

  describe('embed', () => {
    it('should return embedding vector', async () => {
      mockSend.mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify({ embedding: [0.1, 0.2, 0.3] })),
      });

      const result = await embedder.embed('hello');
      expect(result).toEqual([0.1, 0.2, 0.3]);
    });
  });

  describe('embedBatch', () => {
    it('should embed multiple texts', async () => {
      mockSend
        .mockResolvedValueOnce({
          body: new TextEncoder().encode(JSON.stringify({ embedding: [0.1] })),
        })
        .mockResolvedValueOnce({
          body: new TextEncoder().encode(JSON.stringify({ embedding: [0.2] })),
        });

      const result = await embedder.embedBatch(['a', 'b']);
      expect(result).toEqual([[0.1], [0.2]]);
    });

    it('should return empty array for empty input', async () => {
      const result = await embedder.embedBatch([]);
      expect(result).toEqual([]);
      expect(mockSend).not.toHaveBeenCalled();
    });
  });
});
