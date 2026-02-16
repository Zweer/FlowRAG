import { IndexingPipeline } from './indexing/pipeline.js';
import { QueryPipeline } from './querying/pipeline.js';
import type {
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
      await indexingPipeline.process(inputs, options?.force);
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

    async stats() {
      const [documents, chunks, entities, relations, vectors] = await Promise.all([
        config.storage.kv.list('doc:').then((keys) => keys.length),
        config.storage.kv.list('chunk:').then((keys) => keys.length),
        config.storage.graph.getEntities().then((e) => e.length),
        // Count relations using 'out' only to avoid double-counting
        config.storage.graph.getEntities().then(async (entities) => {
          const counts = await Promise.all(
            entities.map((e) => config.storage.graph.getRelations(e.id, 'out')),
          );
          return counts.flat().length;
        }),
        config.storage.vector.count(),
      ]);

      return { documents, chunks, entities, relations, vectors };
    },
  };
}
