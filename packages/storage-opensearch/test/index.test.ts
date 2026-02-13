import { describe, expect, it } from 'vitest';

import { OpenSearchGraphStorage, OpenSearchVectorStorage } from '../src/index.js';

describe('storage-opensearch exports', () => {
  it('should export OpenSearchVectorStorage', () => {
    expect(OpenSearchVectorStorage).toBeDefined();
  });

  it('should export OpenSearchGraphStorage', () => {
    expect(OpenSearchGraphStorage).toBeDefined();
  });
});
