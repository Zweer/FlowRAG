/**
 * LLM Extractor interface for FlowRAG
 */

import type { ExtractionResult } from '../types.js';
import type { Schema } from '../schema.js';

/** LLM Extractor - extracts entities and relations from text */
export interface LLMExtractor {
  extractEntities(
    content: string,
    knownEntities: string[],
    schema: Schema
  ): Promise<ExtractionResult>;
}
