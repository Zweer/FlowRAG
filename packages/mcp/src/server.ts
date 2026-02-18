import type { GraphStorage } from '@flowrag/core';
import type { FlowRAG } from '@flowrag/pipeline';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import type { FlowRAGMcpConfig } from './config.js';
import { writeMetadata } from './metadata.js';
import { resolveEntity } from './resolve.js';

export async function createServer(
  rag: FlowRAG,
  graph: GraphStorage,
  config: FlowRAGMcpConfig,
): Promise<void> {
  const server = new McpServer({ name: 'flowrag', version: '0.1.0' });

  registerTools(server, rag, graph, config);
  registerResources(server, config);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function registerTools(
  server: McpServer,
  rag: FlowRAG,
  graph: GraphStorage,
  config: FlowRAGMcpConfig,
): void {
  server.tool(
    'flowrag_index',
    'Index documents into the knowledge base',
    { force: z.boolean().optional().describe('Re-index all documents, ignore hashes') },
    async ({ force }) => {
      if (!config.docs) {
        return text('Error: No docs path configured. Set "docs" in config or use --docs flag.');
      }
      await rag.index(config.docs, { force: force ?? false });
      const stats = await rag.stats();
      await writeMetadata(config.data, config, stats.documents);
      return text(
        `Indexed ${stats.documents} documents, ${stats.chunks} chunks, ${stats.entities} entities, ${stats.relations} relations`,
      );
    },
  );

  server.tool(
    'flowrag_search',
    'Search the knowledge base with dual retrieval (vector + graph)',
    {
      query: z.string().describe('Search query'),
      mode: z.enum(['hybrid', 'local', 'global', 'naive']).optional().describe('Search mode'),
      limit: z.number().optional().describe('Max results'),
    },
    async ({ query, mode, limit }) => {
      const results = await rag.search(query, { mode: mode ?? 'hybrid', limit: limit ?? 5 });
      if (results.length === 0) return text('No results found.');
      const lines = results.map(
        (r, i) =>
          `${i + 1}. [${r.source}] score: ${r.score.toFixed(4)}\n   ${r.content.slice(0, 300)}`,
      );
      return text(`Found ${results.length} results:\n\n${lines.join('\n\n')}`);
    },
  );

  server.tool(
    'flowrag_entities',
    'List or filter entities in the knowledge graph',
    {
      type: z.string().optional().describe('Filter by entity type'),
      query: z.string().optional().describe('Filter by name/description substring'),
      limit: z.number().optional().describe('Max results'),
    },
    async ({ type, query, limit }) => {
      const max = limit ?? 20;
      let entities = await graph.getEntities(type ? { type } : undefined);

      if (query) {
        const lower = query.toLowerCase();
        entities = entities.filter(
          (e) =>
            e.name.toLowerCase().includes(lower) || e.description.toLowerCase().includes(lower),
        );
      }

      entities = entities.slice(0, max);

      if (entities.length === 0) return text('No entities found.');
      const lines = entities.map((e) => `[${e.type}] ${e.name}\n  ${e.description}`);
      return text(`${entities.length} entities:\n\n${lines.join('\n\n')}`);
    },
  );

  server.tool(
    'flowrag_relations',
    'Get relations for a specific entity',
    {
      entity: z.string().describe('Entity name'),
      direction: z.enum(['in', 'out', 'both']).optional().describe('Relation direction'),
    },
    async ({ entity, direction }) => {
      const resolved = await resolveEntity(graph, entity);
      const relations = await graph.getRelations(resolved.id, direction ?? 'both');

      if (relations.length === 0) return text(`No relations found for "${resolved.name}".`);
      const lines = relations.map(
        (r) => `${r.sourceId} --[${r.type}]--> ${r.targetId}\n  ${r.description}`,
      );
      return text(`${relations.length} relations for "${resolved.name}":\n\n${lines.join('\n\n')}`);
    },
  );

  server.tool(
    'flowrag_trace',
    'Trace data flow upstream or downstream from an entity',
    {
      entity: z.string().describe('Entity name'),
      direction: z.enum(['upstream', 'downstream']).describe('Trace direction'),
    },
    async ({ entity, direction }) => {
      const resolved = await resolveEntity(graph, entity);
      const flow = await rag.traceDataFlow(resolved.id, direction);

      if (flow.length === 0) return text(`No ${direction} flow found from "${resolved.name}".`);
      const chain = flow.map((e) => e.name).join(' → ');
      return text(`${direction} flow from "${resolved.name}":\n${chain}`);
    },
  );

  server.tool(
    'flowrag_path',
    'Find the shortest path between two entities',
    {
      from: z.string().describe('Source entity name'),
      to: z.string().describe('Target entity name'),
      maxDepth: z.number().optional().describe('Max traversal depth'),
    },
    async ({ from, to, maxDepth }) => {
      const source = await resolveEntity(graph, from);
      const target = await resolveEntity(graph, to);
      const path = await rag.findPath(source.id, target.id, maxDepth ?? 5);

      if (path.length === 0)
        return text(`No path found between "${source.name}" and "${target.name}".`);
      const chain = path.map((r) => `${r.sourceId} --[${r.type}]--> ${r.targetId}`).join('\n');
      return text(`Path from "${source.name}" to "${target.name}":\n${chain}`);
    },
  );

  server.tool('flowrag_stats', 'Get index statistics', {}, async () => {
    const stats = await rag.stats();
    return text(
      `Documents: ${stats.documents}\nChunks: ${stats.chunks}\nEntities: ${stats.entities}\nRelations: ${stats.relations}\nVectors: ${stats.vectors}`,
    );
  });
}

function registerResources(server: McpServer, config: FlowRAGMcpConfig): void {
  server.resource(
    'schema',
    'flowrag://schema',
    { mimeType: 'application/json', description: 'Current FlowRAG schema definition' },
    async () => ({
      contents: [
        {
          uri: 'flowrag://schema',
          mimeType: 'application/json',
          text: JSON.stringify(config.schema, null, 2),
        },
      ],
    }),
  );
}

function text(content: string) {
  return { content: [{ type: 'text' as const, text: content }] };
}
