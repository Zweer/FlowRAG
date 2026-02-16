import type { Embedder } from '@flowrag/core';

export interface LocalEmbedderOptions {
  model?: string;
  dtype?: 'fp32' | 'q8' | 'q4';
  device?: 'auto' | 'cpu' | 'gpu';
}

export class LocalEmbedder implements Embedder {
  readonly modelName: string;
  readonly dimensions: number;
  private readonly dtype: string;
  private readonly device: string;
  private pipeline: unknown = null;

  constructor({
    model = 'Xenova/e5-small-v2',
    dtype = 'q8',
    device = 'auto',
  }: LocalEmbedderOptions = {}) {
    this.modelName = model;
    this.dtype = dtype;
    this.device = device;

    // Set dimensions based on model
    this.dimensions = this.getModelDimensions(this.modelName);
  }

  private getModelDimensions(modelName: string): number {
    // Common embedding model dimensions
    const dimensionMap: Record<string, number> = {
      'Xenova/e5-small-v2': 384,
      'Xenova/e5-base-v2': 768,
      'Xenova/e5-large-v2': 1024,
      'Xenova/all-MiniLM-L6-v2': 384,
      'Xenova/all-MiniLM-L12-v2': 384,
      'Xenova/all-mpnet-base-v2': 768,
    };

    return dimensionMap[modelName] || 384; // Default to 384
  }

  async embed(text: string): Promise<number[]> {
    const pipeline = (await this.getPipeline()) as (
      text: string,
      options: { pooling: string; normalize: boolean },
    ) => Promise<{ data: ArrayLike<number> }>;
    const result = await pipeline(text, { pooling: 'mean', normalize: true });
    return Array.from(result.data);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const pipeline = (await this.getPipeline()) as (
      text: string,
      options: { pooling: string; normalize: boolean },
    ) => Promise<{ data: ArrayLike<number> }>;
    const results = await Promise.all(
      texts.map((text) => pipeline(text, { pooling: 'mean', normalize: true })),
    );
    return results.map((result) => Array.from(result.data));
  }

  private async getPipeline(): Promise<unknown> {
    if (!this.pipeline) {
      const { pipeline } = await import('@huggingface/transformers');
      this.pipeline = await pipeline('feature-extraction', this.modelName, {
        dtype: this.dtype as 'fp32' | 'q8' | 'q4',
        device: this.device as 'auto' | 'cpu' | 'gpu',
      });
    }
    return this.pipeline;
  }
}
