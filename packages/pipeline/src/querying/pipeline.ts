import type { ExtractedEntity } from '@flowrag/core';

import type { Entity, FlowRAGConfig, QueryMode, QueryOptions, SearchResult } from '../types.js';

export class QueryPipeline {
  constructor(
    private config: FlowRAGConfig,
    private options: Required<QueryOptions>,
  ) {}

  async search(query: string, mode: QueryMode, limit: number): Promise<SearchResult[]> {
    switch (mode) {
      case 'naive':
        return this.naiveSearch(query, limit);
      case 'local':
        return this.localSearch(query, limit);
      case 'global':
        return this.globalSearch(query, limit);
      case 'hybrid':
        return this.hybridSearch(query, limit);
      default:
        throw new Error(`Unknown query mode: ${mode}`);
    }
  }

  async traceDataFlow(entityId: string, _direction: 'upstream' | 'downstream'): Promise<Entity[]> {
    return this.config.storage.graph.traverse(entityId, 10, undefined);
  }

  private async naiveSearch(query: string, limit: number): Promise<SearchResult[]> {
    // Simple vector search only
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
    // Focus on specific entities found in query
    const entities = await this.extractEntitiesFromQuery(query);
    const entityIds = entities.map((e) => e.name);

    // Get related chunks through graph traversal
    const relatedEntities = await Promise.all(
      entityIds.map((id) => this.config.storage.graph.traverse(id, 2)),
    );

    const allEntityIds = new Set([...entityIds, ...relatedEntities.flat().map((e) => e.id)]);

    // Vector search with entity context
    const queryVector = await this.config.embedder.embed(query);
    const vectorResults = await this.config.storage.vector.search(queryVector, limit * 2);

    // Filter and score based on entity relevance
    return vectorResults
      .filter((result) => {
        const content = (result.metadata?.content as string) || '';
        return Array.from(allEntityIds).some((entityId) =>
          content.toLowerCase().includes(entityId.toLowerCase()),
        );
      })
      .slice(0, limit)
      .map((result) => ({
        id: result.id,
        content: result.metadata?.content as string,
        score: result.score,
        source: 'vector' as const,
        metadata: result.metadata,
      }));
  }

  private async globalSearch(query: string, limit: number): Promise<SearchResult[]> {
    // Use high-level concepts and themes
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

  private async hybridSearch(query: string, limit: number): Promise<SearchResult[]> {
    // Combine local and global approaches
    const [localResults, globalResults] = await Promise.all([
      this.localSearch(query, Math.ceil(limit * this.options.graphWeight)),
      this.globalSearch(query, Math.ceil(limit * this.options.vectorWeight)),
    ]);

    // Merge and deduplicate
    const merged = this.mergeResults(localResults, globalResults);
    return merged.slice(0, limit);
  }

  private async extractEntitiesFromQuery(query: string): Promise<ExtractedEntity[]> {
    // Simple entity extraction from query
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

    // Sort by score descending
    return merged.sort((a, b) => b.score - a.score);
  }
}
