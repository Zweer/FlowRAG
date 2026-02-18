import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config.js', () => ({
  loadConfig: vi.fn().mockResolvedValue({
    data: './data',
    schema: { entityTypes: ['SERVICE'], relationTypes: ['USES'] },
    embedder: { provider: 'local' },
    extractor: { provider: 'gemini' },
    transport: 'stdio',
    port: 3000,
  }),
}));

const mockRag = {
  index: vi.fn(),
  search: vi.fn(),
  traceDataFlow: vi.fn(),
  findPath: vi.fn(),
  stats: vi.fn(),
};
const mockGraph = { getEntity: vi.fn(), getEntities: vi.fn() };

vi.mock('../src/factory.js', () => ({
  createRagFromConfig: vi.fn().mockReturnValue({ rag: mockRag, graph: mockGraph }),
}));

vi.mock('../src/metadata.js', () => ({
  readMetadata: vi.fn().mockResolvedValue(null),
  detectConfigChanges: vi.fn().mockReturnValue([]),
}));

vi.mock('../src/server.js', () => ({
  createServer: vi.fn(),
}));

vi.mock('node:util', () => ({
  parseArgs: vi.fn().mockReturnValue({ values: {} }),
}));

const { main } = await import('../src/main.js');
const { readMetadata, detectConfigChanges } = await import('../src/metadata.js');
const { createServer } = await import('../src/server.js');

describe('main', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts server with config', async () => {
    await main();
    expect(createServer).toHaveBeenCalledWith(mockRag, mockGraph, expect.any(Object));
  });

  it('checks metadata on startup', async () => {
    await main();
    expect(readMetadata).toHaveBeenCalledWith('./data');
  });

  it('logs warnings when metadata has changes', async () => {
    (readMetadata as ReturnType<typeof vi.fn>).mockResolvedValue({ configHash: 'old' });
    (detectConfigChanges as ReturnType<typeof vi.fn>).mockReturnValue([
      { severity: 'breaking', message: 'Embedder changed.' },
      { severity: 'minor', message: 'Schema changed.' },
    ]);

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await main();

    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('⛔'));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('⚠️'));
    errorSpy.mockRestore();
  });

  it('skips change detection when no metadata exists', async () => {
    (readMetadata as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await main();
    expect(detectConfigChanges).not.toHaveBeenCalled();
  });
});
