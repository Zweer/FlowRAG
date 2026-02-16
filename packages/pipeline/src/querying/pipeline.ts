import type { ExtractedEntity } from '@flowrag/core';

import type { Entity, FlowRAGConfig, QueryMode, QueryOptions, SearchResult } from '../types.js';

export class QueryPipeline {
  constructor(
    private config: FlowRAGConfig,
    private options: Required<QueryOptions>,
  ) {}

  async search(query: string, mode: QueryMode, limit: number): Promise<SearchResult[]> {
    let results: SearchResult[];
    switch (mode) {
      case 'naive':
        results = await this.naiveSearch(query, limit);
        break;
      case 'local':
        results = await this.localSearch(query, limit);
        break;
      case 'global':
        results = await this.globalSearch(query, limit);
        break;
      case 'hybrid':
        results = await this.hybridSearch(query, limit);
        break;
      default:
        throw new Error(`Unknown query mode: ${mode}`);
    }

    if (this.config.reranker && results.length > 0) {
      const reranked = await this.config.reranker.rerank(
        query,
        results.map((r) => ({ id: r.id, content: r.content, score: r.score })),
        limit,
      );
      const byId = new Map(results.map((r) => [r.id, r]));
      results = reranked
        .filter((r) => byId.has(r.id))
        .map((r) => ({ ...byId.get(r.id), score: r.score }) as SearchResult);
    }

    return results;
  }

  async traceDataFlow(entityId: string, direction: 'upstream' | 'downstream'): Promise<Entity[]> {
    const visited = new Set<string>();
    const result: Entity[] = [];
    const relationDir = direction === 'downstream' ? 'out' : 'in';

    const walk = async (id: string, depth: number): Promise<void> => {
      if (depth > 10 || visited.has(id)) return;
      visited.add(id);

      const entity = await this.config.storage.graph.getEntity(id);
      if (entity) result.push(entity);

      const relations = await this.config.storage.graph.getRelations(id, relationDir);
      for (const rel of relations) {
        const nextId = direction === 'downstream' ? rel.targetId : rel.sourceId;
        await walk(nextId, depth + 1);
      }
    };

    await walk(entityId, 0);
    return result;
  }

  private async naiveSearch(query: string, limit: number): Promise<SearchResult[]> {
    const queryVector = await this.config.embedder.embed(query);
    const vectorResults = await this.config.storage.vector.search(queryVector, limit);

    return vectorResults.map((result) => ({
      id: result.id,
      content: (result.metadata?.content as string) || '',
      score: result.score,
      source: 'vector' as const,
      metadata: result.metadata,
    }));
  }

  private async localSearch(query: string, limit: number): Promise<SearchResult[]> {
    // Extract entities from query, then boost results containing related entities
    const entities = await this.extractEntitiesFromQuery(query);
    const entityNames = entities.map((e) => e.name);

    // Expand via graph traversal
    const relatedEntities = await Promise.all(
      entityNames.map((name) => this.config.storage.graph.traverse(name, 2)),
    );
    const allNames = new Set([...entityNames, ...relatedEntities.flat().map((e) => e.name)]);

    // Vector search
    const queryVector = await this.config.embedder.embed(query);
    const vectorResults = await this.config.storage.vector.search(queryVector, limit * 3);

    // Score boost for results mentioning known entities
    const scored = vectorResults.map((result) => {
      const content = ((result.metadata?.content as string) || '').toLowerCase();
      const entityHits = Array.from(allNames).filter((name) =>
        content.includes(name.toLowerCase()),
      ).length;
      const boost = entityHits > 0 ? 1 + entityHits * 0.1 : 0.5;
      return {
        id: result.id,
        content: (result.metadata?.content as string) || '',
        score: result.score * boost,
        source: 'graph' as const,
        metadata: result.metadata,
      };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private async globalSearch(query: string, limit: number): Promise<SearchResult[]> {
    // Enrich query with high-level graph context (entity types, relation keywords)
    const entities = await this.config.storage.graph.getEntities();
    const keywords = new Set<string>();

    for (const entity of entities.slice(0, 50)) {
      const relations = await this.config.storage.graph.getRelations(entity.id, 'out');
      for (const rel of relations) {
        for (const kw of rel.keywords) keywords.add(kw);
      }
    }

    // Augment query with top relation keywords for broader context
    const topKeywords = Array.from(keywords).slice(0, 10).join(' ');
    const enrichedQuery = topKeywords ? `${query} ${topKeywords}` : query;

    const queryVector = await this.config.embedder.embed(enrichedQuery);
    const vectorResults = await this.config.storage.vector.search(queryVector, limit);

    return vectorResults.map((result) => ({
      id: result.id,
      content: (result.metadata?.content as string) || '',
      score: result.score,
      source: 'vector' as const,
      metadata: result.metadata,
    }));
  }

  private async hybridSearch(query: string, limit: number): Promise<SearchResult[]> {
    const [localResults, globalResults] = await Promise.all([
      this.localSearch(query, Math.ceil(limit * this.options.graphWeight)),
      this.globalSearch(query, Math.ceil(limit * this.options.vectorWeight)),
    ]);

    return this.mergeResults(localResults, globalResults).slice(0, limit);
  }

  private async extractEntitiesFromQuery(query: string): Promise<ExtractedEntity[]> {
    try {
      const extraction = await this.config.extractor.extractEntities(
        query,
        await this.getKnownEntities(),
        this.config.schema,
      );
      return extraction.entities;
    } catch {
      return [];
    }
  }

  private async getKnownEntities(): Promise<string[]> {
    const entities = await this.config.storage.graph.getEntities();
    return entities.map((e) => e.name);
  }

  private mergeResults(results1: SearchResult[], results2: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    const merged: SearchResult[] = [];

    for (const result of [...results1, ...results2]) {
      if (!seen.has(result.id)) {
        seen.add(result.id);
        merged.push(result);
      }
    }

    return merged.sort((a, b) => b.score - a.score);
  }
}
