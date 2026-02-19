/** Document passed to an evaluator */
export interface EvalDocument {
  content: string;
  score: number;
}

/** Evaluation result with named scores */
export interface EvalResult {
  scores: Record<string, number>;
}

/** Pluggable evaluator for RAG quality metrics */
export interface Evaluator {
  evaluate(query: string, documents: EvalDocument[], reference?: string): Promise<EvalResult>;
}
