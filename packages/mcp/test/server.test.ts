import type { Entity, GraphStorage, Relation } from '@flowrag/core';
import type { FlowRAG } from '@flowrag/pipeline';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FlowRAGMcpConfig } from '../src/config.js';

// Mock MCP SDK
const mockTool = vi.fn();
const mockResource = vi.fn();
const mockConnect = vi.fn();

class MockMcpServer {
  tool = mockTool;
  resource = mockResource;
  connect = mockConnect;
}

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: MockMcpServer,
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class {},
}));

vi.mock('../src/metadata.js', () => ({
  writeMetadata: vi.fn(),
}));

const { createServer } = await import('../src/server.js');

const baseConfig: FlowRAGMcpConfig = {
  data: './data',
  docs: './content',
  schema: { entityTypes: ['SERVICE'], relationTypes: ['USES'] },
  embedder: { provider: 'local' },
  extractor: { provider: 'gemini' },
  transport: 'stdio',
  port: 3000,
};

const entities: Entity[] = [
  { id: 'Auth', name: 'Auth', type: 'SERVICE', description: 'Auth service', sourceChunkIds: [] },
  { id: 'DB', name: 'DB', type: 'DATABASE', description: 'Main database', sourceChunkIds: [] },
];

const relations: Relation[] = [
  {
    id: 'r1',
    sourceId: 'Auth',
    targetId: 'DB',
    type: 'USES',
    description: 'Auth uses DB',
    keywords: ['auth'],
    sourceChunkIds: [],
  },
];

function createMockRag(): FlowRAG {
  return {
    index: vi.fn(),
    deleteDocument: vi.fn(),
    mergeEntities: vi.fn(),
    export: vi.fn(),
    evaluate: vi.fn(),
    search: vi
      .fn()
      .mockResolvedValue([
        { id: 'c1', content: 'Auth handles login', score: 0.95, source: 'vector' },
      ]),
    traceDataFlow: vi.fn().mockResolvedValue(entities),
    findPath: vi.fn().mockResolvedValue(relations),
    stats: vi.fn().mockResolvedValue({
      documents: 10,
      chunks: 50,
      entities: 5,
      relations: 8,
      vectors: 50,
    }),
  };
}

function createMockGraph(): GraphStorage {
  return {
    getEntity: vi
      .fn()
      .mockImplementation(async (id: string) => entities.find((e) => e.id === id) ?? null),
    getEntities: vi.fn().mockResolvedValue(entities),
    getRelations: vi.fn().mockResolvedValue(relations),
    addEntity: vi.fn(),
    addRelation: vi.fn(),
    traverse: vi.fn().mockResolvedValue([]),
    findPath: vi.fn().mockResolvedValue([]),
    deleteEntity: vi.fn(),
    deleteRelation: vi.fn(),
  };
}

describe('createServer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers 7 tools and 1 resource', async () => {
    await createServer(createMockRag(), createMockGraph(), baseConfig);

    expect(mockTool).toHaveBeenCalledTimes(7);
    expect(mockResource).toHaveBeenCalledTimes(1);
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('registers tools with correct names', async () => {
    await createServer(createMockRag(), createMockGraph(), baseConfig);

    const toolNames = mockTool.mock.calls.map((c: unknown[]) => c[0]);
    expect(toolNames).toEqual([
      'flowrag_index',
      'flowrag_search',
      'flowrag_entities',
      'flowrag_relations',
      'flowrag_trace',
      'flowrag_path',
      'flowrag_stats',
    ]);
  });

  it('registers schema resource', async () => {
    await createServer(createMockRag(), createMockGraph(), baseConfig);

    expect(mockResource).toHaveBeenCalledWith(
      'schema',
      'flowrag://schema',
      expect.objectContaining({ mimeType: 'application/json' }),
      expect.any(Function),
    );
  });
});

describe('tool handlers', () => {
  function getToolHandler(name: string): (...args: unknown[]) => Promise<unknown> {
    const call = mockTool.mock.calls.find((c: unknown[]) => c[0] === name);
    if (!call) throw new Error(`Tool "${name}" not found`);
    return call[call.length - 1];
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    await createServer(createMockRag(), createMockGraph(), baseConfig);
  });

  it('flowrag_index indexes docs and returns stats', async () => {
    const handler = getToolHandler('flowrag_index');
    const result = await handler({});
    expect(result).toEqual({
      content: [{ type: 'text', text: expect.stringContaining('Indexed 10 documents') }],
    });
  });

  it('flowrag_index returns error when no docs configured', async () => {
    vi.clearAllMocks();
    const configNoDocs = { ...baseConfig, docs: undefined };
    await createServer(createMockRag(), createMockGraph(), configNoDocs);

    const handler = getToolHandler('flowrag_index');
    const result = await handler({ force: false });
    expect(result).toEqual({
      content: [{ type: 'text', text: expect.stringContaining('Error') }],
    });
  });

  it('flowrag_search returns formatted results', async () => {
    const handler = getToolHandler('flowrag_search');
    const result = await handler({ query: 'auth', mode: 'hybrid', limit: 5 });
    expect(result).toEqual({
      content: [{ type: 'text', text: expect.stringContaining('Found 1 results') }],
    });
  });

  it('flowrag_search returns no results message', async () => {
    vi.clearAllMocks();
    const rag = createMockRag();
    (rag.search as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await createServer(rag, createMockGraph(), baseConfig);

    const handler = getToolHandler('flowrag_search');
    const result = await handler({ query: 'nothing' });
    expect(result).toEqual({
      content: [{ type: 'text', text: 'No results found.' }],
    });
  });

  it('flowrag_entities returns entity list', async () => {
    const handler = getToolHandler('flowrag_entities');
    const result = await handler({});
    expect(result).toEqual({
      content: [{ type: 'text', text: expect.stringContaining('2 entities') }],
    });
  });

  it('flowrag_entities filters by type', async () => {
    const handler = getToolHandler('flowrag_entities');
    const result = await handler({ type: 'SERVICE' });
    expect(result).toEqual({
      content: [{ type: 'text', text: expect.stringContaining('entities') }],
    });
  });

  it('flowrag_entities filters by query', async () => {
    const handler = getToolHandler('flowrag_entities');
    const result = await handler({ query: 'auth' });
    expect(result).toEqual({
      content: [{ type: 'text', text: expect.stringContaining('Auth') }],
    });
  });

  it('flowrag_entities returns no entities message', async () => {
    vi.clearAllMocks();
    const graph = createMockGraph();
    (graph.getEntities as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await createServer(createMockRag(), graph, baseConfig);

    const handler = getToolHandler('flowrag_entities');
    const result = await handler({});
    expect(result).toEqual({
      content: [{ type: 'text', text: 'No entities found.' }],
    });
  });

  it('flowrag_relations returns relations', async () => {
    const handler = getToolHandler('flowrag_relations');
    const result = await handler({ entity: 'Auth' });
    expect(result).toEqual({
      content: [{ type: 'text', text: expect.stringContaining('1 relations') }],
    });
  });

  it('flowrag_relations returns no relations message', async () => {
    vi.clearAllMocks();
    const graph = createMockGraph();
    (graph.getRelations as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await createServer(createMockRag(), graph, baseConfig);

    const handler = getToolHandler('flowrag_relations');
    const result = await handler({ entity: 'Auth' });
    expect(result).toEqual({
      content: [{ type: 'text', text: expect.stringContaining('No relations found') }],
    });
  });

  it('flowrag_trace returns flow chain', async () => {
    const handler = getToolHandler('flowrag_trace');
    const result = await handler({ entity: 'Auth', direction: 'downstream' });
    expect(result).toEqual({
      content: [{ type: 'text', text: expect.stringContaining('Auth → DB') }],
    });
  });

  it('flowrag_trace returns no flow message', async () => {
    vi.clearAllMocks();
    const rag = createMockRag();
    (rag.traceDataFlow as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await createServer(rag, createMockGraph(), baseConfig);

    const handler = getToolHandler('flowrag_trace');
    const result = await handler({ entity: 'Auth', direction: 'upstream' });
    expect(result).toEqual({
      content: [{ type: 'text', text: expect.stringContaining('No upstream flow') }],
    });
  });

  it('flowrag_path returns path', async () => {
    const handler = getToolHandler('flowrag_path');
    const result = await handler({ from: 'Auth', to: 'DB' });
    expect(result).toEqual({
      content: [{ type: 'text', text: expect.stringContaining('Auth --[USES]--> DB') }],
    });
  });

  it('flowrag_path returns no path message', async () => {
    vi.clearAllMocks();
    const rag = createMockRag();
    (rag.findPath as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await createServer(rag, createMockGraph(), baseConfig);

    const handler = getToolHandler('flowrag_path');
    const result = await handler({ from: 'Auth', to: 'DB' });
    expect(result).toEqual({
      content: [{ type: 'text', text: expect.stringContaining('No path found') }],
    });
  });

  it('flowrag_stats returns stats', async () => {
    const handler = getToolHandler('flowrag_stats');
    const result = await handler({});
    expect(result).toEqual({
      content: [{ type: 'text', text: expect.stringContaining('Documents: 10') }],
    });
  });
});

describe('resource handlers', () => {
  it('schema resource returns config schema as JSON', async () => {
    vi.clearAllMocks();
    await createServer(createMockRag(), createMockGraph(), baseConfig);

    const handler = mockResource.mock.calls[0][3];
    const result = await handler();
    expect(result.contents[0].uri).toBe('flowrag://schema');
    expect(result.contents[0].mimeType).toBe('application/json');
    expect(JSON.parse(result.contents[0].text)).toEqual(baseConfig.schema);
  });
});
