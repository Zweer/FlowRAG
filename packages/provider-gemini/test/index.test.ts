import { describe, expect, it } from 'vitest';

import { GeminiEmbedder, GeminiExtractor } from '../src/index.js';

describe('provider-gemini exports', () => {
  it('should export GeminiEmbedder', () => {
    expect(GeminiEmbedder).toBeDefined();
    expect(typeof GeminiEmbedder).toBe('function');
  });

  it('should export GeminiExtractor', () => {
    expect(GeminiExtractor).toBeDefined();
    expect(typeof GeminiExtractor).toBe('function');
  });
});
