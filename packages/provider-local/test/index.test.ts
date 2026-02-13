import { describe, expect, it } from 'vitest';

import { LocalEmbedder, LocalReranker } from '../src/index.js';

describe('provider-local exports', () => {
  it('should export LocalEmbedder', () => {
    expect(LocalEmbedder).toBeDefined();
    expect(typeof LocalEmbedder).toBe('function');
  });

  it('should export LocalReranker', () => {
    expect(LocalReranker).toBeDefined();
    expect(typeof LocalReranker).toBe('function');
  });
});
