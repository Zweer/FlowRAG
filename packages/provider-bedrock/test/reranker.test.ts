import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BedrockRerankerModels } from '../src/models.js';
import { BedrockReranker } from '../src/reranker.js';

const mockSend = vi.fn();

vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: class {
    send = mockSend;
  },
  InvokeModelCommand: class {
    constructor(public input: unknown) {}
  },
}));

describe('BedrockReranker', () => {
  let reranker: BedrockReranker;

  beforeEach(() => {
    vi.clearAllMocks();
    reranker = new BedrockReranker();
  });

  it('should use default model', () => {
    const r = new BedrockReranker();
    expect(r).toBeDefined();
  });

  it('should accept custom model and region', () => {
    const r = new BedrockReranker({ model: 'custom', region: 'eu-west-1' });
    expect(r).toBeDefined();
  });

  it('should return empty for empty documents', async () => {
    const results = await reranker.rerank('query', []);
    expect(results).toEqual([]);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('should rerank documents', async () => {
    mockSend.mockResolvedValue({
      body: new TextEncoder().encode(
        JSON.stringify({
          results: [
            { index: 1, relevanceScore: 0.95 },
            { index: 0, relevanceScore: 0.7 },
          ],
        }),
      ),
    });

    const docs = [
      { id: 'd1', content: 'first doc', score: 0.5 },
      { id: 'd2', content: 'second doc', score: 0.6 },
    ];

    const results = await reranker.rerank('query', docs);

    expect(results).toEqual([
      { id: 'd2', score: 0.95, index: 1 },
      { id: 'd1', score: 0.7, index: 0 },
    ]);
  });

  it('should pass limit as topN', async () => {
    mockSend.mockResolvedValue({
      body: new TextEncoder().encode(
        JSON.stringify({ results: [{ index: 0, relevanceScore: 0.9 }] }),
      ),
    });

    const docs = [
      { id: 'd1', content: 'doc1', score: 0.5 },
      { id: 'd2', content: 'doc2', score: 0.6 },
    ];

    await reranker.rerank('query', docs, 1);

    const call = mockSend.mock.calls[0][0];
    const body = JSON.parse(call.input.body);
    expect(body.topN).toBe(1);
    expect(body.query).toBe('query');
    expect(body.documents).toHaveLength(2);
  });

  it('should use default model ID', async () => {
    mockSend.mockResolvedValue({
      body: new TextEncoder().encode(
        JSON.stringify({ results: [{ index: 0, relevanceScore: 0.9 }] }),
      ),
    });

    await reranker.rerank('q', [{ id: '1', content: 'c', score: 0 }]);

    const call = mockSend.mock.calls[0][0];
    expect(call.input.modelId).toBe(BedrockRerankerModels.RERANK_V1);
  });
});
