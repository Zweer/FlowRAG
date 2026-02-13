import type { ExtractionResult } from '@flowrag/core';

import type { Chunk, Document, FlowRAGConfig, IndexingOptions } from '../types.js';
import { Chunker } from './chunker.js';
import { Scanner } from './scanner.js';

export class IndexingPipeline {
  private scanner = new Scanner();
  private chunker: Chunker;

  constructor(
    private config: FlowRAGConfig,
    private options: Required<IndexingOptions>,
  ) {
    this.chunker = new Chunker(options.chunkSize, options.chunkOverlap);
  }

  async process(inputs: string[]): Promise<void> {
    // 1. Scanner: Parse files
    const documents = await this.scanner.scanFiles(inputs);

    // 2. Process documents with concurrency control
    const batches = this.createBatches(documents, this.options.maxParallelInsert);

    for (const batch of batches) {
      await Promise.all(batch.map((doc) => this.processDocument(doc)));
    }
  }

  private async processDocument(document: Document): Promise<void> {
    // Store document
    await this.config.storage.kv.set(document.id, document);

    // 2. Chunker: Split into chunks
    const chunks = this.chunker.chunkDocument(document);

    // Process chunks with LLM concurrency control
    const chunkBatches = this.createBatches(chunks, this.options.llmMaxAsync);

    for (const chunkBatch of chunkBatches) {
      await Promise.all(chunkBatch.map((chunk) => this.processChunk(chunk)));
    }
  }

  private async processChunk(chunk: Chunk): Promise<void> {
    // Store chunk
    await this.config.storage.kv.set(chunk.id, chunk);

    // Check cache for LLM extraction
    const cacheKey = `extraction:${this.hashContent(chunk.content)}`;
    let extraction = await this.config.storage.kv.get<ExtractionResult>(cacheKey);

    if (!extraction) {
      // 3. Extractor: LLM extracts entities + relations
      const knownEntities = await this.getKnownEntities();
      extraction = await this.config.extractor.extractEntities(
        chunk.content,
        knownEntities,
        this.config.schema,
      );

      // Cache the extraction
      await this.config.storage.kv.set(cacheKey, extraction);
    }

    // 4. Embedder: Generate embeddings
    const embedding = await this.config.embedder.embed(chunk.content);

    // Call hook if provided
    if (this.config.hooks?.onEntitiesExtracted) {
      extraction = await this.config.hooks.onEntitiesExtracted(extraction, {
        chunkId: chunk.id,
        documentId: chunk.documentId,
        content: chunk.content,
      });
    }

    // 5. Storage: Save to all stores
    await Promise.all([
      // Vector storage
      this.config.storage.vector.upsert([
        {
          id: chunk.id,
          vector: embedding,
          metadata: { documentId: chunk.documentId, content: chunk.content },
        },
      ]),

      // Graph storage - entities
      ...extraction.entities.map((entity) =>
        this.config.storage.graph.addEntity({
          id: entity.name,
          name: entity.name,
          type: entity.type,
          description: entity.description,
          sourceChunkIds: [chunk.id],
          ...(entity.fields ? { fields: entity.fields } : {}),
        }),
      ),

      // Graph storage - relations
      ...extraction.relations.map((relation) =>
        this.config.storage.graph.addRelation({
          id: `${relation.source}-${relation.type}-${relation.target}`,
          sourceId: relation.source,
          targetId: relation.target,
          type: relation.type,
          description: relation.description,
          keywords: relation.keywords,
          sourceChunkIds: [chunk.id],
          ...(relation.fields ? { fields: relation.fields } : {}),
        }),
      ),
    ]);
  }

  private async getKnownEntities(): Promise<string[]> {
    const entities = await this.config.storage.graph.getEntities();
    return entities.map((e) => e.name);
  }

  private hashContent(content: string): string {
    // Simple hash for caching
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  dispose(): void {
    this.chunker.dispose();
  }
}
