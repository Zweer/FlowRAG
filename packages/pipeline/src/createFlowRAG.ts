import { IndexingPipeline } from './indexing/pipeline.js';
import { QueryPipeline } from './querying/pipeline.js';
import type {
  ExportFormat,
  FlowRAG,
  FlowRAGConfig,
  IndexingOptions,
  IndexOptions,
  QueryOptions,
} from './types.js';

export function createFlowRAG(config: FlowRAGConfig): FlowRAG {
  const indexingOptions: Required<IndexingOptions> = {
    chunkSize: 1200,
    chunkOverlap: 100,
    maxParallelInsert: 2,
    llmMaxAsync: 4,
    embeddingMaxAsync: 16,
    extractionGleanings: 0,
    ...config.options?.indexing,
  };

  const queryOptions: Required<QueryOptions> = {
    defaultMode: 'hybrid',
    maxResults: 10,
    vectorWeight: 0.7,
    graphWeight: 0.3,
    ...config.options?.querying,
  };

  const indexingPipeline = new IndexingPipeline(config, indexingOptions);
  const queryPipeline = new QueryPipeline(config, queryOptions);

  return {
    async index(input: string | string[], options?: IndexOptions): Promise<void> {
      const inputs = Array.isArray(input) ? input : [input];
      await indexingPipeline.process(inputs, options?.force, options?.onProgress);
    },

    async deleteDocument(documentId: string): Promise<void> {
      await indexingPipeline.deleteDocument(documentId);
    },

    async search(query: string, options = {}) {
      const mode = options.mode ?? queryOptions.defaultMode;
      const limit = options.limit ?? queryOptions.maxResults;
      return queryPipeline.search(query, mode, limit);
    },

    async traceDataFlow(entityId: string, direction: 'upstream' | 'downstream') {
      return queryPipeline.traceDataFlow(entityId, direction);
    },

    async findPath(fromId: string, toId: string, maxDepth = 5) {
      return config.storage.graph.findPath(fromId, toId, maxDepth);
    },

    async export(format: ExportFormat): Promise<string> {
      const entities = await config.storage.graph.getEntities();
      const allRelations = [];
      for (const entity of entities) {
        const rels = await config.storage.graph.getRelations(entity.id, 'out');
        allRelations.push(...rels);
      }

      switch (format) {
        case 'json':
          return JSON.stringify({ entities, relations: allRelations }, null, 2);

        case 'csv': {
          const header = 'source,type,target,description';
          const rows = allRelations.map(
            (r) =>
              `"${r.sourceId}","${r.type}","${r.targetId}","${r.description.replace(/"/g, '""')}"`,
          );
          return [header, ...rows].join('\n');
        }

        case 'dot': {
          const lines = ['digraph FlowRAG {', '  rankdir=LR;'];
          for (const e of entities) {
            lines.push(`  "${e.name}" [label="${e.name}\\n(${e.type})"];`);
          }
          for (const r of allRelations) {
            const target = entities.find((e) => e.id === r.targetId);
            if (target) {
              const source = entities.find((e) => e.id === r.sourceId);
              if (source) {
                lines.push(`  "${source.name}" -> "${target.name}" [label="${r.type}"];`);
              }
            }
          }
          lines.push('}');
          return lines.join('\n');
        }
      }
    },

    async stats() {
      const [documents, chunks, allEntities, vectors] = await Promise.all([
        config.storage.kv.list('doc:').then((keys) => keys.length),
        config.storage.kv.list('chunk:').then((keys) => keys.length),
        config.storage.graph.getEntities(),
        config.storage.vector.count(),
      ]);

      const counts = await Promise.all(
        allEntities.map((e) => config.storage.graph.getRelations(e.id, 'out')),
      );

      return {
        documents,
        chunks,
        entities: allEntities.length,
        relations: counts.flat().length,
        vectors,
      };
    },
  };
}
