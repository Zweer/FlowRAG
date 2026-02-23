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

class MockStdioTransport {
  close = vi.fn();
}

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: MockMcpServer,
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: MockStdioTransport,
}));

let lastTransportInstance: { onclose?: () => void; sessionId: string } | null = null;

vi.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => ({
  StreamableHTTPServerTransport: class {
    sessionId = 'test-session';
    onclose: (() => void) | undefined;
    handleRequest: ReturnType<typeof vi.fn>;
    close = vi.fn();
    constructor(opts?: {
      sessionIdGenerator?: () => string;
      onsessioninitialized?: (sid: string) => void;
    }) {
      lastTransportInstance = this;
      this.handleRequest = vi.fn(async () => {
        this.sessionId = opts?.sessionIdGenerator?.() ?? 'test-session';
        opts?.onsessioninitialized?.(this.sessionId);
      });
    }
  },
}));

const mockListen = vi.fn((_port: number, cb: () => void) => {
  cb();
  return { close: vi.fn((cb: () => void) => cb()) };
});
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();

vi.mock('@modelcontextprotocol/sdk/server/express.js', () => ({
  createMcpExpressApp: vi.fn(() => ({
    get: mockGet,
    post: mockPost,
    delete: mockDelete,
    listen: mockListen,
  })),
}));

vi.mock('@modelcontextprotocol/sdk/types.js', () => ({
  isInitializeRequest: vi.fn(() => true),
}));

vi.mock('../src/metadata.js', () => ({
  writeMetadata: vi.fn(),
}));

const { createServer } = await import('../src/server.js');
const { isInitializeRequest } = await import('@modelcontextprotocol/sdk/types.js');

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

describe('stdio transport', () => {
  it('returns a handle with close()', async () => {
    const handle = await createServer(createMockRag(), createMockGraph(), baseConfig);
    expect(handle).toHaveProperty('close');
    await handle.close();
  });
});

describe('HTTP transport', () => {
  const httpConfig: FlowRAGMcpConfig = { ...baseConfig, transport: 'http', port: 0 };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  function getRouteHandler(mockFn: ReturnType<typeof vi.fn>, path: string) {
    const call = mockFn.mock.calls.find((c: unknown[]) => c[0] === path);
    if (!call) throw new Error(`Route "${path}" not found`);
    return call[call.length - 1]; // last arg is always the handler
  }

  function mockReq(headers: Record<string, string> = {}, body?: unknown) {
    return { headers, body } as unknown as import('express').Request;
  }

  function mockRes() {
    const res = {
      headersSent: false,
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as import('express').Response & {
      headersSent: boolean;
      json: ReturnType<typeof vi.fn>;
      status: ReturnType<typeof vi.fn>;
      send: ReturnType<typeof vi.fn>;
    };
    return res;
  }

  it('starts HTTP server and registers routes', async () => {
    const handle = await createServer(createMockRag(), createMockGraph(), httpConfig);

    // health + GET /mcp
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockListen).toHaveBeenCalledWith(0, expect.any(Function));

    await handle.close();
  });

  it('registers health endpoint', async () => {
    const handle = await createServer(createMockRag(), createMockGraph(), httpConfig);

    const healthCall = mockGet.mock.calls.find((c: unknown[]) => c[0] === '/health');
    expect(healthCall).toBeDefined();

    const res = mockRes();
    healthCall?.[1]({}, res);
    expect(res.json).toHaveBeenCalledWith({ status: 'ok' });

    await handle.close();
  });

  it('applies auth middleware when auth is configured', async () => {
    const authConfig = { ...httpConfig, auth: { token: 'secret' } };
    const handle = await createServer(createMockRag(), createMockGraph(), authConfig);

    // POST /mcp should have 3 args (path, authMiddleware, handler)
    const postCall = mockPost.mock.calls.find((c: unknown[]) => c[0] === '/mcp');
    expect(postCall).toHaveLength(3);

    await handle.close();
  });

  it('skips auth middleware when no auth configured', async () => {
    const handle = await createServer(createMockRag(), createMockGraph(), httpConfig);

    // POST /mcp should have 2 args (path, handler)
    const postCall = mockPost.mock.calls.find((c: unknown[]) => c[0] === '/mcp');
    expect(postCall).toHaveLength(2);

    await handle.close();
  });

  it('POST /mcp creates transport for initialize request', async () => {
    const handle = await createServer(createMockRag(), createMockGraph(), httpConfig);
    const handler = getRouteHandler(mockPost, '/mcp');

    const req = mockReq({}, { method: 'initialize' });
    const res = mockRes();
    await handler(req, res);

    // Should have created a transport and called handleRequest
    await handle.close();
  });

  it('POST /mcp returns 400 for non-init request without session', async () => {
    vi.mocked(isInitializeRequest).mockReturnValueOnce(false);

    const handle = await createServer(createMockRag(), createMockGraph(), httpConfig);
    const handler = getRouteHandler(mockPost, '/mcp');

    const req = mockReq({}, { method: 'tools/list' });
    const res = mockRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: -32000 }) }),
    );

    await handle.close();
  });

  it('POST /mcp returns 500 on internal error', async () => {
    vi.mocked(isInitializeRequest).mockImplementationOnce(() => {
      throw new Error('boom');
    });

    const handle = await createServer(createMockRag(), createMockGraph(), httpConfig);
    const handler = getRouteHandler(mockPost, '/mcp');

    const req = mockReq({}, {});
    const res = mockRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    await handle.close();
  });

  it('GET /mcp returns 400 for missing session', async () => {
    const handle = await createServer(createMockRag(), createMockGraph(), httpConfig);
    const handler = getRouteHandler(mockGet, '/mcp');

    const res = mockRes();
    await handler(mockReq({}), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Invalid or missing session ID');

    await handle.close();
  });

  it('DELETE /mcp returns 400 for missing session', async () => {
    const handle = await createServer(createMockRag(), createMockGraph(), httpConfig);
    const handler = getRouteHandler(mockDelete, '/mcp');

    const res = mockRes();
    await handler(mockReq({}), res);

    expect(res.status).toHaveBeenCalledWith(400);

    await handle.close();
  });

  it('POST /mcp does not send 500 if headers already sent', async () => {
    vi.mocked(isInitializeRequest).mockImplementationOnce(() => {
      throw new Error('boom');
    });

    const handle = await createServer(createMockRag(), createMockGraph(), httpConfig);
    const handler = getRouteHandler(mockPost, '/mcp');

    const res = mockRes();
    res.headersSent = true;
    await handler(mockReq({}, {}), res);

    expect(res.status).not.toHaveBeenCalled();

    await handle.close();
  });

  it('POST /mcp reuses existing transport for known session', async () => {
    const handle = await createServer(createMockRag(), createMockGraph(), httpConfig);
    const handler = getRouteHandler(mockPost, '/mcp');

    // First: initialize to create session
    await handler(mockReq({}, { method: 'initialize' }), mockRes());
    const sid = lastTransportInstance?.sessionId ?? '';

    // Second: reuse session
    const res = mockRes();
    await handler(mockReq({ 'mcp-session-id': sid }, { method: 'tools/list' }), res);

    // Should not return 400
    expect(res.status).not.toHaveBeenCalled();

    await handle.close();
  });

  it('GET /mcp delegates to transport for valid session', async () => {
    const handle = await createServer(createMockRag(), createMockGraph(), httpConfig);
    const postHandler = getRouteHandler(mockPost, '/mcp');
    const getHandler = getRouteHandler(mockGet, '/mcp');

    // Initialize session
    await postHandler(mockReq({}, { method: 'initialize' }), mockRes());
    const sid = lastTransportInstance?.sessionId ?? '';

    // GET with valid session
    const res = mockRes();
    await getHandler(mockReq({ 'mcp-session-id': sid }), res);

    expect(res.status).not.toHaveBeenCalled();

    await handle.close();
  });

  it('DELETE /mcp delegates to transport for valid session', async () => {
    const handle = await createServer(createMockRag(), createMockGraph(), httpConfig);
    const postHandler = getRouteHandler(mockPost, '/mcp');
    const deleteHandler = getRouteHandler(mockDelete, '/mcp');

    // Initialize session
    await postHandler(mockReq({}, { method: 'initialize' }), mockRes());
    const sid = lastTransportInstance?.sessionId ?? '';

    // DELETE with valid session
    const res = mockRes();
    await deleteHandler(mockReq({ 'mcp-session-id': sid }), res);

    expect(res.status).not.toHaveBeenCalled();

    await handle.close();
  });

  it('onclose cleans up session from transports map', async () => {
    const handle = await createServer(createMockRag(), createMockGraph(), httpConfig);
    const postHandler = getRouteHandler(mockPost, '/mcp');

    // Initialize session (stores transport in map)
    await postHandler(mockReq({}, { method: 'initialize' }), mockRes());

    // Trigger onclose
    lastTransportInstance?.onclose?.();

    // Session should be removed — next request with that session should fail
    const sid = lastTransportInstance?.sessionId ?? '';
    const res = mockRes();
    const getHandler = getRouteHandler(mockGet, '/mcp');
    await getHandler(mockReq({ 'mcp-session-id': sid }), res);
    expect(res.status).toHaveBeenCalledWith(400);

    await handle.close();
  });

  it('onclose is safe when sessionId is undefined', async () => {
    const handle = await createServer(createMockRag(), createMockGraph(), httpConfig);
    const postHandler = getRouteHandler(mockPost, '/mcp');

    await postHandler(mockReq({}, { method: 'initialize' }), mockRes());

    // Clear sessionId before triggering onclose
    if (lastTransportInstance) lastTransportInstance.sessionId = undefined as unknown as string;
    lastTransportInstance?.onclose?.();

    await handle.close();
  });
});
