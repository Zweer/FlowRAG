import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AnthropicReranker } from '../src/reranker.js';

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: mockCreate };
  },
}));

describe('AnthropicReranker', () => {
  let reranker: AnthropicReranker;

  beforeEach(() => {
    vi.clearAllMocks();
    reranker = new AnthropicReranker({ apiKey: 'test-key' });
  });

  it('should accept custom model', () => {
    const r = new AnthropicReranker({ model: 'claude-opus-4-6' });
    expect(r).toBeDefined();
  });

  it('should return empty for empty documents', async () => {
    const results = await reranker.rerank('query', []);
    expect(results).toEqual([]);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should rerank documents', async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify([
            { index: 1, score: 0.95 },
            { index: 0, score: 0.6 },
          ]),
        },
      ],
    });

    const docs = [
      { id: 'd1', content: 'first', score: 0.5 },
      { id: 'd2', content: 'second', score: 0.4 },
    ];

    const results = await reranker.rerank('query', docs);
    expect(results).toEqual([
      { id: 'd2', score: 0.95, index: 1 },
      { id: 'd1', score: 0.6, index: 0 },
    ]);
  });

  it('should respect limit', async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify([
            { index: 1, score: 0.95 },
            { index: 0, score: 0.6 },
          ]),
        },
      ],
    });

    const docs = [
      { id: 'd1', content: 'first', score: 0.5 },
      { id: 'd2', content: 'second', score: 0.4 },
    ];

    const results = await reranker.rerank('query', docs, 1);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('d2');
  });

  it('should handle non-text content block', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'tool_use', id: 'x' }],
    });

    const results = await reranker.rerank('q', [{ id: '1', content: 'c', score: 0 }]);
    expect(results).toEqual([]);
  });

  it('should handle no JSON array in response', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'no array here' }],
    });

    const results = await reranker.rerank('q', [{ id: '1', content: 'c', score: 0 }]);
    expect(results).toEqual([]);
  });
});
