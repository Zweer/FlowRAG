import { existsSync, readFileSync } from 'node:fs';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => '{}'),
}));

vi.mock('@flowrag/core', () => ({
  defineSchema: vi.fn((config) => ({ ...config })),
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

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);

describe('getFlowRAG', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
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

  it('should use default entity/relation types when no config file', async () => {
    const { defineSchema } = await import('@flowrag/core');
    const { getFlowRAG } = await import('../src/rag.js');

    getFlowRAG('./data');

    expect(defineSchema).toHaveBeenCalledWith(
      expect.objectContaining({
        entityTypes: ['ENTITY'],
        relationTypes: ['RELATES_TO'],
      }),
    );
  });

  it('should load schema from flowrag.json when present', async () => {
    mockExistsSync.mockImplementation((p) => String(p).endsWith('flowrag.json'));
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        entityTypes: ['SERVICE', 'DATABASE'],
        relationTypes: ['USES'],
      }),
    );

    const { defineSchema } = await import('@flowrag/core');
    const { getFlowRAG } = await import('../src/rag.js');

    getFlowRAG('./data');

    expect(defineSchema).toHaveBeenCalledWith(
      expect.objectContaining({
        entityTypes: ['SERVICE', 'DATABASE'],
        relationTypes: ['USES'],
      }),
    );
  });

  it('should reset singleton with resetFlowRAG', async () => {
    const { getFlowRAG, resetFlowRAG } = await import('../src/rag.js');
    const first = getFlowRAG('./data');
    resetFlowRAG();
    const second = getFlowRAG('./data');
    expect(first).not.toBe(second);
  });
});
