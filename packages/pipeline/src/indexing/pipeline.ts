import { createHash } from 'node:crypto';

import type { ExtractionResult } from '@flowrag/core';

import type { Chunk, Document, FlowRAGConfig, IndexingOptions, IndexProgress } from '../types.js';
import { Chunker } from './chunker.js';
import type { ScanOptions } from './scanner.js';
import { Scanner } from './scanner.js';

export class IndexingPipeline {
  private scanner: Scanner;
  private chunker: Chunker;

  constructor(
    private config: FlowRAGConfig,
    private options: Required<IndexingOptions>,
  ) {
    this.scanner = new Scanner(config.parsers);
    this.chunker = new Chunker(options.chunkSize, options.chunkOverlap);
  }

  async process(
    inputs: string[],
    force = false,
    onProgress?: (event: IndexProgress) => void,
    scanOptions?: ScanOptions,
  ): Promise<void> {
    const progress: IndexProgress = {
      type: 'scan',
      documentsTotal: 0,
      documentsProcessed: 0,
      chunksTotal: 0,
      chunksProcessed: 0,
    };

    // 1. Scanner: Parse files
    const documents = await this.scanner.scanFiles(inputs, scanOptions);
    progress.documentsTotal = documents.length;
    onProgress?.(progress);

    // 2. Delete stale documents (files that no longer exist in scanned paths)
    await this.deleteStaleDocuments(documents, inputs, progress, onProgress);

    // 3. Process documents with concurrency control
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
      const llmStart = Date.now();
      extraction = await this.config.extractor.extractEntities(
        chunk.content,
        knownEntities,
        this.config.schema,
      );
      extraction.entities ??= [];
      extraction.relations ??= [];

      // Gleaning: additional extraction passes for higher accuracy
      for (let i = 0; i < this.options.extractionGleanings; i++) {
        const gleanedNames = extraction.entities.map((e) => e.name);
        const gleaned = await this.config.extractor.extractEntities(
          chunk.content,
          [...knownEntities, ...gleanedNames],
          this.config.schema,
        );
        extraction = this.mergeExtractions(extraction, gleaned);
      }

      this.config.observability?.onLLMCall?.({
        model: 'extractor',
        duration: Date.now() - llmStart,
        usage: extraction.usage,
      });

      // Cache the extraction
      await this.config.storage.kv.set(cacheKey, extraction);
    }

    // Ensure extraction has valid arrays (LLM may return partial results)
    extraction.entities ??= [];
    extraction.relations ??= [];

    // 4. Embedder: Generate embeddings
    const embedStart = Date.now();
    const embedding = await this.config.embedder.embed(chunk.content);
    this.config.observability?.onEmbedding?.({
      model: this.config.embedder.modelName,
      textsCount: 1,
      duration: Date.now() - embedStart,
    });

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
          keywords: relation.keywords ?? [],
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

  private async deleteStaleDocuments(
    scannedDocs: Document[],
    inputs: string[],
    progress: IndexProgress,
    onProgress?: (event: IndexProgress) => void,
  ): Promise<void> {
    const scannedIds = new Set(scannedDocs.map((d) => d.id));
    const existingHashKeys = await this.config.storage.kv.list('docHash:');

    for (const hashKey of existingHashKeys) {
      const docId = hashKey.slice('docHash:'.length);
      if (scannedIds.has(docId)) continue;

      // Only delete if the document's file path is under one of the input paths
      const filePath = this.decodeDocId(docId);
      if (!filePath) continue;
      if (!inputs.some((input) => filePath.startsWith(input))) continue;

      await this.deleteDocument(docId);
      onProgress?.({ ...progress, type: 'document:delete', documentId: docId });
    }
  }

  async deleteDocument(docId: string): Promise<void> {
    // 1. Find all chunks for this document
    const chunkKeys = await this.config.storage.kv.list(`chunk:${docId}:`);

    if (chunkKeys.length > 0) {
      const chunkIdSet = new Set(chunkKeys);

      // 2. Delete vectors
      await this.config.storage.vector.delete(chunkKeys);

      // 3. Clean up graph — delete entities/relations that only came from this document
      const allEntities = await this.config.storage.graph.getEntities();

      for (const entity of allEntities) {
        const remaining = entity.sourceChunkIds.filter((id) => !chunkIdSet.has(id));
        if (remaining.length === 0) {
          // Entity only existed because of this document — deleteEntity cascades relations
          await this.config.storage.graph.deleteEntity(entity.id);
        } else if (remaining.length < entity.sourceChunkIds.length) {
          // Entity is shared — update sourceChunkIds
          await this.config.storage.graph.addEntity({ ...entity, sourceChunkIds: remaining });

          // Check this entity's relations too
          const relations = await this.config.storage.graph.getRelations(entity.id, 'both');
          for (const rel of relations) {
            const relRemaining = rel.sourceChunkIds.filter((id) => !chunkIdSet.has(id));
            if (relRemaining.length === 0) {
              await this.config.storage.graph.deleteRelation(rel.id);
            } else if (relRemaining.length < rel.sourceChunkIds.length) {
              await this.config.storage.graph.addRelation({ ...rel, sourceChunkIds: relRemaining });
            }
          }
        }
      }

      // 4. Delete chunks from KV
      await Promise.all(chunkKeys.map((key) => this.config.storage.kv.delete(key)));
    }

    // 5. Delete document and hash
    await Promise.all([
      this.config.storage.kv.delete(docId),
      this.config.storage.kv.delete(`docHash:${docId}`),
    ]);
  }

  private mergeExtractions(base: ExtractionResult, gleaned: ExtractionResult): ExtractionResult {
    const entities = gleaned.entities ?? [];
    const relations = gleaned.relations ?? [];
    const entityNames = new Set(base.entities.map((e) => e.name));
    const relationIds = new Set(base.relations.map((r) => `${r.source}-${r.type}-${r.target}`));

    return {
      entities: [...base.entities, ...entities.filter((e) => !entityNames.has(e.name))],
      relations: [
        ...base.relations,
        ...relations.filter((r) => !relationIds.has(`${r.source}-${r.type}-${r.target}`)),
      ],
      usage: base.usage,
    };
  }

  private decodeDocId(docId: string): string | null {
    if (!docId.startsWith('doc:')) return null;
    return Buffer.from(docId.slice('doc:'.length), 'base64url').toString();
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
