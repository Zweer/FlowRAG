/**
 * Reranker interface for FlowRAG
 */

/** A scored document to rerank */
export interface RerankDocument {
  id: string;
  content: string;
  score: number;
}

/** Result after reranking */
export interface RerankResult {
  id: string;
  score: number;
  index: number;
}

/** Reranker - re-scores search results for better relevance */
export interface Reranker {
  rerank(query: string, documents: RerankDocument[], limit?: number): Promise<RerankResult[]>;
}
