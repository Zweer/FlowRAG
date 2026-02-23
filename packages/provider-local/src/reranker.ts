import type { RerankDocument, Reranker, RerankResult } from '@flowrag/core';

export interface LocalRerankerOptions {
  model?: string;
  dtype?: 'fp32' | 'q8' | 'q4';
  device?: 'auto' | 'cpu' | 'gpu';
}

export class LocalReranker implements Reranker {
  readonly modelName: string;
  private readonly dtype: string;
  private readonly device: string;
  private pipeline: unknown = null;

  constructor({
    model = 'Xenova/ms-marco-MiniLM-L-6-v2',
    dtype = 'q8',
    device = 'auto',
  }: LocalRerankerOptions = {}) {
    this.modelName = model;
    this.dtype = dtype;
    this.device = device;
  }

  async rerank(
    query: string,
    documents: RerankDocument[],
    limit?: number,
  ): Promise<RerankResult[]> {
    if (documents.length === 0) return [];

    const classifier = (await this.getPipeline()) as (
      inputs: { text: string; text_pair: string }[],
      options: { topk: number },
    ) => Promise<{ label: string; score: number }[][]>;

    const inputs = documents.map((d) => ({ text: query, text_pair: d.content }));
    const scores = await classifier(inputs, { topk: 1 });

    const ranked = documents
      .map((d, i) => ({ id: d.id, score: scores[i][0].score, index: i }))
      .sort((a, b) => b.score - a.score);

    return limit ? ranked.slice(0, limit) : ranked;
  }

  private async getPipeline(): Promise<unknown> {
    if (!this.pipeline) {
      const { env, pipeline } = await import('@huggingface/transformers');
      if (process.env.HF_HOME) env.cacheDir = process.env.HF_HOME;
      this.pipeline = await pipeline('text-classification', this.modelName, {
        dtype: this.dtype as 'fp32' | 'q8' | 'q4',
        device: this.device as 'auto' | 'cpu' | 'gpu',
      });
    }
    return this.pipeline;
  }
}
