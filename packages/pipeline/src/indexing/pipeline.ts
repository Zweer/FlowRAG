import { createHash } from 'node:crypto';

import type { ExtractionResult } from '@flowrag/core';

import type { Chunk, Document, FlowRAGConfig, IndexingOptions, IndexProgress } from '../types.js';
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

  async process(
    inputs: string[],
    force = false,
    onProgress?: (event: IndexProgress) => void,
  ): Promise<void> {
    const progress: IndexProgress = {
      type: 'scan',
      documentsTotal: 0,
      documentsProcessed: 0,
      chunksTotal: 0,
      chunksProcessed: 0,
    };

    // 1. Scanner: Parse files
    const documents = await this.scanner.scanFiles(inputs);
    progress.documentsTotal = documents.length;
    onProgress?.(progress);

    // 2. Process documents with concurrency control
    const batches = this.createBatches(documents, this.options.maxParallelInsert);

    for (const batch of batches) {
      await Promise.all(batch.map((doc) => this.processDocument(doc, force, progress, onProgress)));
    }

    onProgress?.({ ...progress, type: 'done' });
  }

  private async processDocument(
    document: Document,
    force: boolean,
    progress: IndexProgress,
    onProgress?: (event: IndexProgress) => void,
  ): Promise<void> {
    // Incremental: skip unchanged documents
    const hash = this.hashDocument(document.content);
    if (!force) {
      const stored = await this.config.storage.kv.get<string>(`docHash:${document.id}`);
      if (stored === hash) {
        progress.documentsProcessed++;
        onProgress?.({ ...progress, type: 'document:skip', documentId: document.id });
        return;
      }
    }

    onProgress?.({ ...progress, type: 'document:start', documentId: document.id });

    // Store document
    await this.config.storage.kv.set(document.id, document);

    // 2. Chunker: Split into chunks
    const chunks = this.chunker.chunkDocument(document);
    progress.chunksTotal += chunks.length;

    // Process chunks with LLM concurrency control
    const chunkBatches = this.createBatches(chunks, this.options.llmMaxAsync);

    for (const chunkBatch of chunkBatches) {
      await Promise.all(chunkBatch.map((chunk) => this.processChunk(chunk, progress, onProgress)));
    }

    // Save hash after successful processing
    await this.config.storage.kv.set(`docHash:${document.id}`, hash);

    progress.documentsProcessed++;
    onProgress?.({ ...progress, type: 'document:done', documentId: document.id });
  }

  private async processChunk(
    chunk: Chunk,
    progress: IndexProgress,
    onProgress?: (event: IndexProgress) => void,
  ): Promise<void> {
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

    progress.chunksProcessed++;
    onProgress?.({ ...progress, type: 'chunk:done', chunkId: chunk.id });
  }

  private async getKnownEntities(): Promise<string[]> {
    const entities = await this.config.storage.graph.getEntities();
    return entities.map((e) => e.name);
  }

  private hashDocument(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex').slice(0, 16);
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
