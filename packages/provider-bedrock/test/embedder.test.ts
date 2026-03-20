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

  describe('Cohere models', () => {
    let cohereEmbedder: BedrockEmbedder;

    beforeEach(() => {
      cohereEmbedder = new BedrockEmbedder({ model: 'cohere.embed-v4:0' });
    });

    it('should use Cohere body format for embed', async () => {
      mockSend.mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify({ embeddings: [[0.1, 0.2]] })),
      });

      const result = await cohereEmbedder.embed('hello');
      expect(result).toEqual([0.1, 0.2]);

      const call = mockSend.mock.calls[0][0];
      const body = JSON.parse(call.input.body);
      expect(body.texts).toEqual(['hello']);
      expect(body.input_type).toBe('search_document');
      expect(body.truncate).toBe('END');
    });

    it('should use Cohere batch format for embedBatch', async () => {
      mockSend.mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify({ embeddings: [[0.1], [0.2]] })),
      });

      const result = await cohereEmbedder.embedBatch(['a', 'b']);
      expect(result).toEqual([[0.1], [0.2]]);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should respect custom inputType', async () => {
      const queryEmbedder = new BedrockEmbedder({
        model: 'cohere.embed-multilingual-v3',
        inputType: 'search_query',
      });

      mockSend.mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify({ embeddings: [[0.5]] })),
      });

      await queryEmbedder.embed('query');

      const call = mockSend.mock.calls[0][0];
      const body = JSON.parse(call.input.body);
      expect(body.input_type).toBe('search_query');
    });
  });
});
