import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LocalReranker } from '../src/reranker.js';

vi.mock('@huggingface/transformers', () => ({
  pipeline: vi
    .fn()
    .mockResolvedValue(
      vi
        .fn()
        .mockResolvedValue([
          [{ label: 'LABEL_0', score: 0.7 }],
          [{ label: 'LABEL_0', score: 0.95 }],
          [{ label: 'LABEL_0', score: 0.3 }],
        ]),
    ),
}));

describe('LocalReranker', () => {
  let reranker: LocalReranker;

  beforeEach(() => {
    vi.clearAllMocks();
    reranker = new LocalReranker({ dtype: 'fp32' });
  });

  it('should use default model', () => {
    expect(reranker.modelName).toBe('Xenova/ms-marco-MiniLM-L-6-v2');
  });

  it('should accept custom options', () => {
    const r = new LocalReranker({ model: 'custom', dtype: 'fp32', device: 'cpu' });
    expect(r.modelName).toBe('custom');
  });

  it('should return empty for empty documents', async () => {
    const results = await reranker.rerank('query', []);
    expect(results).toEqual([]);
  });

  it('should rerank documents by score descending', async () => {
    const docs = [
      { id: 'd1', content: 'first', score: 0.5 },
      { id: 'd2', content: 'second', score: 0.4 },
      { id: 'd3', content: 'third', score: 0.6 },
    ];

    const results = await reranker.rerank('query', docs);

    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({ id: 'd2', score: 0.95, index: 1 });
    expect(results[1]).toEqual({ id: 'd1', score: 0.7, index: 0 });
    expect(results[2]).toEqual({ id: 'd3', score: 0.3, index: 2 });
  });

  it('should respect limit', async () => {
    const docs = [
      { id: 'd1', content: 'first', score: 0.5 },
      { id: 'd2', content: 'second', score: 0.4 },
      { id: 'd3', content: 'third', score: 0.6 },
    ];

    const results = await reranker.rerank('query', docs, 2);
    expect(results).toHaveLength(2);
  });

  it('should reuse pipeline on subsequent calls', async () => {
    const { pipeline } = await import('@huggingface/transformers');
    const docs = [{ id: 'd1', content: 'test', score: 0 }];

    await reranker.rerank('q1', docs);
    await reranker.rerank('q2', docs);

    expect(pipeline).toHaveBeenCalledTimes(1);
  });
});
