import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRag = {
  index: vi.fn(),
  search: vi.fn(),
  stats: vi.fn(() =>
    Promise.resolve({ documents: 3, chunks: 10, entities: 5, relations: 4, vectors: 10 }),
  ),
  traceDataFlow: vi.fn(),
  findPath: vi.fn(),
};

vi.mock('../src/rag.js', () => ({
  getFlowRAG: vi.fn(() => mockRag),
}));

describe('index command', () => {
  let indexCommand: typeof import('../src/commands/index.js').indexCommand;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    ({ indexCommand } = await import('../src/commands/index.js'));
  });

  it('should index documents and print stats', async () => {
    await indexCommand.parseAsync(['./content'], { from: 'user' });

    expect(mockRag.index).toHaveBeenCalledWith('./content');
    expect(mockRag.stats).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('📄 Indexing documents from: ./content');
    expect(console.log).toHaveBeenCalledWith('✅ Indexed 3 documents, 10 chunks');
  });

  it('should accept --data option', async () => {
    const { getFlowRAG } = await import('../src/rag.js');
    await indexCommand.parseAsync(['./docs', '--data', '/tmp/mydata'], { from: 'user' });

    expect(getFlowRAG).toHaveBeenCalledWith('/tmp/mydata');
  });
});

describe('search command', () => {
  let searchCommand: typeof import('../src/commands/search.js').searchCommand;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    ({ searchCommand } = await import('../src/commands/search.js'));
  });

  it('should search and print results', async () => {
    mockRag.search.mockResolvedValueOnce([
      { id: '1', content: 'Hello world', score: 0.95, source: 'vector' },
    ]);

    await searchCommand.parseAsync(['how does auth work'], { from: 'user' });

    expect(mockRag.search).toHaveBeenCalledWith('how does auth work', {
      mode: 'hybrid',
      limit: 5,
    });
    expect(console.log).toHaveBeenCalledWith('🔍 1 result(s) for "how does auth work":\n');
  });

  it('should print no results message when empty', async () => {
    mockRag.search.mockResolvedValueOnce([]);

    await searchCommand.parseAsync(['nothing here'], { from: 'user' });

    expect(console.log).toHaveBeenCalledWith('No results found.');
  });

  it('should pass mode and limit options', async () => {
    mockRag.search.mockResolvedValueOnce([]);

    await searchCommand.parseAsync(['query', '--mode', 'naive', '--limit', '10'], {
      from: 'user',
    });

    expect(mockRag.search).toHaveBeenCalledWith('query', { mode: 'naive', limit: 10 });
  });
});

describe('stats command', () => {
  let statsCommand: typeof import('../src/commands/stats.js').statsCommand;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    ({ statsCommand } = await import('../src/commands/stats.js'));
  });

  it('should print index statistics', async () => {
    await statsCommand.parseAsync([], { from: 'user' });

    expect(mockRag.stats).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('📊 FlowRAG Index Stats:');
    expect(console.log).toHaveBeenCalledWith('   Documents: 3');
    expect(console.log).toHaveBeenCalledWith('   Chunks:    10');
    expect(console.log).toHaveBeenCalledWith('   Entities:  5');
    expect(console.log).toHaveBeenCalledWith('   Relations: 4');
    expect(console.log).toHaveBeenCalledWith('   Vectors:   10');
  });
});
