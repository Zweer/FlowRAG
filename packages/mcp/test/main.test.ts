import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
  createRagFromConfig: vi.fn().mockResolvedValue({ rag: mockRag, graph: mockGraph }),
}));

vi.mock('../src/metadata.js', () => ({
  readMetadata: vi.fn().mockResolvedValue(null),
  detectConfigChanges: vi.fn().mockReturnValue([]),
}));

const mockClose = vi.fn();
vi.mock('../src/server.js', () => ({
  createServer: vi.fn().mockResolvedValue({ close: mockClose }),
}));

vi.mock('node:util', () => ({
  parseArgs: vi.fn().mockReturnValue({ values: {} }),
}));

const { main } = await import('../src/main.js');
const { loadConfig } = await import('../src/config.js');
const { readMetadata, detectConfigChanges } = await import('../src/metadata.js');
const { createServer } = await import('../src/server.js');

describe('main', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGTERM');
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

  it('registers shutdown handlers for HTTP transport', async () => {
    (loadConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: './data',
      schema: { entityTypes: ['SERVICE'], relationTypes: ['USES'] },
      embedder: { provider: 'local' },
      extractor: { provider: 'gemini' },
      transport: 'http',
      port: 3000,
    });

    await main();

    expect(process.listenerCount('SIGINT')).toBeGreaterThan(0);
    expect(process.listenerCount('SIGTERM')).toBeGreaterThan(0);
  });

  it('does not register shutdown handlers for stdio transport', async () => {
    (loadConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: './data',
      schema: { entityTypes: ['SERVICE'], relationTypes: ['USES'] },
      embedder: { provider: 'local' },
      extractor: { provider: 'gemini' },
      transport: 'stdio',
      port: 3000,
    });

    const sigintBefore = process.listenerCount('SIGINT');
    await main();

    expect(process.listenerCount('SIGINT')).toBe(sigintBefore);
  });

  it('shutdown handler calls close and exits', async () => {
    (loadConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: './data',
      schema: { entityTypes: ['SERVICE'], relationTypes: ['USES'] },
      embedder: { provider: 'local' },
      extractor: { provider: 'gemini' },
      transport: 'http',
      port: 3000,
    });

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await main();

    // Trigger SIGINT handler
    process.emit('SIGINT');
    // Wait for async handler
    await new Promise((r) => setTimeout(r, 10));

    expect(mockClose).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
