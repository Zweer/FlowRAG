/**
 * Embedder interface for FlowRAG
 */

/** Embedder - generates vector embeddings from text */
export interface Embedder {
  readonly dimensions: number;
  readonly modelName: string;

  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}
