import { describe, expect, it } from 'vitest';

import { LocalEmbedder } from '../src/index.js';

describe('provider-local exports', () => {
  it('should export LocalEmbedder', () => {
    expect(LocalEmbedder).toBeDefined();
    expect(typeof LocalEmbedder).toBe('function');
  });
});
