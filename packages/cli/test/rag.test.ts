import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@flowrag/core', () => ({
  defineSchema: vi.fn(() => ({ entityTypes: [], relationTypes: [] })),
}));

vi.mock('@flowrag/pipeline', () => ({
  createFlowRAG: vi.fn(() => ({ mock: true })),
}));

vi.mock('@flowrag/presets', () => ({
  createLocalStorage: vi.fn(() => ({
    storage: { kv: {}, vector: {}, graph: {} },
    embedder: {},
    extractor: {},
  })),
}));

describe('getFlowRAG', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should create a FlowRAG instance with rag and config', async () => {
    const { getFlowRAG } = await import('../src/rag.js');
    const instance = getFlowRAG('./test-data');
    expect(instance.rag).toBeDefined();
    expect(instance.config).toBeDefined();
    expect(instance.config.storage).toBeDefined();
  });

  it('should cache the instance on subsequent calls', async () => {
    const { getFlowRAG } = await import('../src/rag.js');
    const first = getFlowRAG('./data');
    const second = getFlowRAG('./data');
    expect(first).toBe(second);
  });
});
