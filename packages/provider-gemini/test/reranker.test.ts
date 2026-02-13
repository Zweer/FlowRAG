import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GeminiReranker } from '../src/reranker.js';

const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerateContent };
  },
}));

describe('GeminiReranker', () => {
  let reranker: GeminiReranker;

  beforeEach(() => {
    vi.clearAllMocks();
    reranker = new GeminiReranker({ apiKey: 'test-key' });
  });

  it('should require API key', () => {
    expect(() => new GeminiReranker()).toThrow('Gemini API key is required');
  });

  it('should accept custom model', () => {
    const r = new GeminiReranker({ apiKey: 'k', model: 'custom' });
    expect(r).toBeDefined();
  });

  it('should return empty for empty documents', async () => {
    const results = await reranker.rerank('query', []);
    expect(results).toEqual([]);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('should rerank documents via LLM', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify([
        { index: 1, score: 0.95 },
        { index: 0, score: 0.6 },
      ]),
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
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify([
        { index: 1, score: 0.95 },
        { index: 0, score: 0.6 },
      ]),
    });

    const docs = [
      { id: 'd1', content: 'first', score: 0.5 },
      { id: 'd2', content: 'second', score: 0.4 },
    ];

    const results = await reranker.rerank('query', docs, 1);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('d2');
  });

  it('should truncate long content', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify([{ index: 0, score: 0.9 }]),
    });

    const longContent = 'x'.repeat(1000);
    await reranker.rerank('q', [{ id: '1', content: longContent, score: 0 }]);

    const call = mockGenerateContent.mock.calls[0][0];
    const prompt = call.contents[0].parts[0].text;
    // Content should be truncated to 500 chars
    expect(prompt).not.toContain('x'.repeat(1000));
  });

  it('should handle null response text', async () => {
    mockGenerateContent.mockResolvedValue({ text: null });

    const results = await reranker.rerank('q', [{ id: '1', content: 'c', score: 0 }]);
    expect(results).toEqual([]);
  });
});
