/**
 * Core types for FlowRAG
 */

/** Unique identifier */
export type Id = string;

/** Document - original input file/text */
export interface Document {
  id: Id;
  content: string;
  metadata: DocumentMetadata;
}

export interface DocumentMetadata {
  filePath?: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
}

/** Chunk - a piece of a document */
export interface Chunk {
  id: Id;
  documentId: Id;
  content: string;
  index: number;
  tokenCount: number;
}

/** Entity - a node in the knowledge graph */
export interface Entity {
  id: Id;
  name: string;
  type: string;
  description: string;
  sourceChunkIds: Id[];
}

/** Relation - an edge in the knowledge graph */
export interface Relation {
  id: Id;
  sourceId: Id;
  targetId: Id;
  type: string;
  description: string;
  keywords: string[];
  sourceChunkIds: Id[];
}

/** Vector record for storage */
export interface VectorRecord {
  id: Id;
  vector: number[];
  metadata: Record<string, unknown>;
}

/** Search result from vector storage */
export interface SearchResult {
  id: Id;
  score: number;
  metadata: Record<string, unknown>;
}

/** Filter for vector search */
export interface VectorFilter {
  [field: string]: unknown;
}

/** Filter for entity queries */
export interface EntityFilter {
  type?: string;
  name?: string;
}

/** Direction for relation queries */
export type RelationDirection = 'in' | 'out' | 'both';

/** Extracted entity from LLM */
export interface ExtractedEntity {
  name: string;
  type: string;
  description: string;
}

/** Extracted relation from LLM */
export interface ExtractedRelation {
  source: string;
  target: string;
  type: string;
  description: string;
  keywords: string[];
}

/** Result of entity extraction */
export interface ExtractionResult {
  entities: ExtractedEntity[];
  relations: ExtractedRelation[];
}

/** Query modes */
export type QueryMode = 'local' | 'global' | 'hybrid' | 'naive';
