import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OpenAIReranker } from '../src/reranker.js';

const mockCreate = vi.fn();

vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: mockCreate } };
  },
}));

describe('OpenAIReranker', () => {
  let reranker: OpenAIReranker;

  beforeEach(() => {
    vi.clearAllMocks();
    reranker = new OpenAIReranker({ apiKey: 'test-key' });
  });

  it('should accept custom model', () => {
    const r = new OpenAIReranker({ model: 'gpt-5' });
    expect(r).toBeDefined();
  });

  it('should return empty for empty documents', async () => {
    const results = await reranker.rerank('query', []);
    expect(results).toEqual([]);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should rerank documents', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify([
              { index: 1, score: 0.95 },
              { index: 0, score: 0.6 },
            ]),
          },
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
      choices: [
        {
          message: {
            content: JSON.stringify([
              { index: 1, score: 0.95 },
              { index: 0, score: 0.6 },
            ]),
          },
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

  it('should handle wrapped JSON object response', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              results: [{ index: 0, score: 0.9 }],
            }),
          },
        },
      ],
    });

    const results = await reranker.rerank('q', [{ id: '1', content: 'c', score: 0 }]);
    expect(results).toEqual([{ id: '1', score: 0.9, index: 0 }]);
  });

  it('should handle rankings key in JSON object response', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              rankings: [{ index: 0, score: 0.8 }],
            }),
          },
        },
      ],
    });

    const results = await reranker.rerank('q', [{ id: '1', content: 'c', score: 0 }]);
    expect(results).toEqual([{ id: '1', score: 0.8, index: 0 }]);
  });

  it('should handle object with no known keys', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ unknown: 'data' }) } }],
    });

    const results = await reranker.rerank('q', [{ id: '1', content: 'c', score: 0 }]);
    expect(results).toEqual([]);
  });

  it('should handle null response content', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: {} }] });

    const results = await reranker.rerank('q', [{ id: '1', content: 'c', score: 0 }]);
    expect(results).toEqual([]);
  });
});
