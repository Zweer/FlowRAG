import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockStats = {
  documents: 3,
  chunks: 10,
  entities: 5,
  relations: 4,
  vectors: 10,
};

const mockEntities = [
  { id: 'e1', name: 'ServiceA', type: 'SERVICE', description: 'Main service', sourceChunkIds: [] },
  { id: 'e2', name: 'DatabaseB', type: 'DATABASE', description: 'Primary DB', sourceChunkIds: [] },
];

const mockRelations = [
  {
    id: 'r1',
    sourceId: 'e1',
    targetId: 'e2',
    type: 'USES',
    description: 'ServiceA uses DatabaseB',
    keywords: ['uses'],
    sourceChunkIds: [],
  },
];

const mockRag = {
  index: vi.fn(),
  search: vi.fn(),
  stats: vi.fn(() => Promise.resolve(mockStats)),
  traceDataFlow: vi.fn(),
  findPath: vi.fn(),
};

const mockConfig = {
  storage: {
    kv: {},
    vector: {},
    graph: {
      getEntities: vi.fn(() => Promise.resolve(mockEntities)),
      getRelations: vi.fn(() => Promise.resolve(mockRelations)),
    },
  },
  embedder: {},
  extractor: {},
};

vi.mock('../src/rag.js', () => ({
  getFlowRAG: vi.fn(() => ({ rag: mockRag, config: mockConfig })),
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

    expect(mockRag.index).toHaveBeenCalledWith('./content', { force: undefined });
    expect(mockRag.stats).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('📄 Indexing documents from: ./content');
    expect(console.log).toHaveBeenCalledWith('✅ Indexed 3 documents, 10 chunks');
  });

  it('should accept --data option', async () => {
    const { getFlowRAG } = await import('../src/rag.js');
    await indexCommand.parseAsync(['./docs', '--data', '/tmp/mydata'], { from: 'user' });

    expect(getFlowRAG).toHaveBeenCalledWith('/tmp/mydata', undefined);
  });

  it('should pass force option with --force', async () => {
    await indexCommand.parseAsync(['./content', '--force'], { from: 'user' });

    expect(mockRag.index).toHaveBeenCalledWith('./content', { force: true });
  });

  it('should pass review hook with --interactive', async () => {
    const { getFlowRAG } = await import('../src/rag.js');
    await indexCommand.parseAsync(['./content', '--interactive'], { from: 'user' });

    expect(getFlowRAG).toHaveBeenCalledWith(
      './data',
      expect.objectContaining({ onEntitiesExtracted: expect.any(Function) }),
    );
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

  it('should search entities with --type entities', async () => {
    await searchCommand.parseAsync(['ServiceA', '--type', 'entities'], { from: 'user' });

    expect(mockConfig.storage.graph.getEntities).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('🔍 1 entity(ies) matching "ServiceA":\n');
    expect(console.log).toHaveBeenCalledWith('  [SERVICE] ServiceA');
  });

  it('should print no entities found', async () => {
    mockConfig.storage.graph.getEntities.mockResolvedValueOnce([]);

    await searchCommand.parseAsync(['Unknown', '--type', 'entities'], { from: 'user' });

    expect(console.log).toHaveBeenCalledWith('No entities found.');
  });

  it('should search relations with --type relations', async () => {
    await searchCommand.parseAsync(['ServiceA', '--type', 'relations'], { from: 'user' });

    expect(mockConfig.storage.graph.getRelations).toHaveBeenCalledWith('e1', 'both');
    expect(console.log).toHaveBeenCalledWith('🔍 1 relation(s) for "ServiceA":\n');
  });

  it('should print no entity found for relations search', async () => {
    mockConfig.storage.graph.getEntities.mockResolvedValueOnce([]);

    await searchCommand.parseAsync(['Unknown', '--type', 'relations'], { from: 'user' });

    expect(console.log).toHaveBeenCalledWith('No entity found with name "Unknown".');
  });

  it('should print no relations found', async () => {
    mockConfig.storage.graph.getRelations.mockResolvedValueOnce([]);

    await searchCommand.parseAsync(['ServiceA', '--type', 'relations'], { from: 'user' });

    expect(console.log).toHaveBeenCalledWith('No relations found for "ServiceA".');
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

describe('init command', () => {
  let initCommand: typeof import('../src/commands/init.js').initCommand;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.mock('node:fs/promises', async (importOriginal) => {
      const actual = await importOriginal<typeof import('node:fs/promises')>();
      return { ...actual, mkdir: vi.fn() };
    });
    ({ initCommand } = await import('../src/commands/init.js'));
  });

  it('should create data directories', async () => {
    await initCommand.parseAsync([], { from: 'user' });

    expect(console.log).toHaveBeenCalledWith('✅ Initialized FlowRAG at ./data');
  });

  it('should accept custom data path', async () => {
    await initCommand.parseAsync(['--data', '/tmp/custom'], { from: 'user' });

    expect(console.log).toHaveBeenCalledWith('✅ Initialized FlowRAG at /tmp/custom');
  });
});

describe('graph command', () => {
  let graphCommand: typeof import('../src/commands/graph.js').graphCommand;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    ({ graphCommand } = await import('../src/commands/graph.js'));
  });

  it('should show graph stats with type breakdown', async () => {
    await graphCommand.parseAsync(['stats'], { from: 'user' });

    expect(console.log).toHaveBeenCalledWith('📊 Knowledge Graph Stats:\n');
    expect(console.log).toHaveBeenCalledWith('   Entities: 2');
    expect(console.log).toHaveBeenCalledWith('     DATABASE: 1');
    expect(console.log).toHaveBeenCalledWith('     SERVICE: 1');
    expect(console.log).toHaveBeenCalledWith('     USES: 2');
  });

  it('should export graph in DOT format', async () => {
    await graphCommand.parseAsync(['export'], { from: 'user' });

    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(output).toContain('digraph FlowRAG {');
    expect(output).toContain('"ServiceA"');
    expect(output).toContain('"DatabaseB"');
    expect(output).toContain('-> "DatabaseB"');
    expect(output).toContain('[label="USES"]');
  });

  it('should skip relations with unknown target in DOT export', async () => {
    mockConfig.storage.graph.getRelations.mockResolvedValue([
      { ...mockRelations[0], targetId: 'unknown' },
    ]);

    await graphCommand.parseAsync(['export'], { from: 'user' });

    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(output).not.toContain('-> "unknown"');
  });
});
