import { describe, expect, it } from 'vitest';

import {
  createFlowRAG,
  type FlowRAG,
  type FlowRAGConfig,
  type IndexingOptions,
  IndexingPipeline,
  type IndexProgress,
  type QueryMode,
  type QueryOptions,
  QueryPipeline,
} from '../src/index.js';

describe('Package exports', () => {
  it('should export createFlowRAG function', () => {
    expect(typeof createFlowRAG).toBe('function');
  });

  it('should export IndexingPipeline class', () => {
    expect(typeof IndexingPipeline).toBe('function');
    expect(IndexingPipeline.name).toBe('IndexingPipeline');
  });

  it('should export QueryPipeline class', () => {
    expect(typeof QueryPipeline).toBe('function');
    expect(QueryPipeline.name).toBe('QueryPipeline');
  });

  it('should export types (compile-time check)', () => {
    // These are compile-time checks - if they compile, the types are exported
    // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
    const _flowRAG: FlowRAG = {} as any;
    // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
    const _config: FlowRAGConfig = {} as any;
    // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
    const _indexingOptions: IndexingOptions = {} as any;
    const _queryMode: QueryMode = 'hybrid';
    // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
    const _queryOptions: QueryOptions = {} as any;

    // biome-ignore lint/suspicious/noExplicitAny: need to access private methods
    const _progress: IndexProgress = {} as any;

    // Suppress unused variable warnings
    expect(_flowRAG).toBeDefined();
    expect(_config).toBeDefined();
    expect(_indexingOptions).toBeDefined();
    expect(_queryMode).toBe('hybrid');
    expect(_queryOptions).toBeDefined();
    expect(_progress).toBeDefined();
  });
});
