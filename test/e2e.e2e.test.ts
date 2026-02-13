/**
 * E2E test: Full indexing + query pipeline with real components.
 *
 * Uses:
 * - Real storage: JSON KV, LanceDB vectors, SQLite graph
 * - Real embedder: Local ONNX (Xenova/e5-small-v2)
 * - Mock extractor: Returns realistic entities/relations from A Christmas Carol
 *
 * Run with: npm run test:e2e
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { defineSchema, type ExtractionResult, type LLMExtractor } from '@flowrag/core';
import { createFlowRAG } from '@flowrag/pipeline';
import { LocalEmbedder } from '@flowrag/provider-local';
import { JsonKVStorage } from '@flowrag/storage-json';
import { LanceDBVectorStorage } from '@flowrag/storage-lancedb';
import { SQLiteGraphStorage } from '@flowrag/storage-sqlite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// --- Test data: A Christmas Carol excerpts ---

const STAVE_1 = `Marley was dead: to begin with. There is no doubt whatever about that.
Old Marley was as dead as a door-nail. Scrooge knew he was dead? Of course he did.
Scrooge and he were partners for I don't know how many years. Scrooge was his sole
executor, his sole administrator, his sole assign, his sole residuary legatee, his
sole friend, and sole mourner. Scrooge never painted out Old Marley's name. There it
stood, years afterwards, above the warehouse door: Scrooge and Marley. The firm was
known as Scrooge and Marley. Sometimes people new to the business called Scrooge
Scrooge, and sometimes Marley, but he answered to both names. It was all the same to him.

Oh! But he was a tight-fisted hand at the grindstone, Scrooge! a squeezing, wrenching,
grasping, scraping, clutching, covetous, old sinner! External heat and cold had little
influence on Scrooge. No warmth could warm, no wintry weather chill him.

Scrooge had a very small fire in his counting-house, but Bob Cratchit's fire was so
very much smaller that it looked like one coal. But he couldn't replenish it, for
Scrooge kept the coal-box in his own room.`;

const STAVE_2 = `The Ghost of Christmas Past took Scrooge's hand and flew with him to the scenes of
his youth. They visited the school where young Ebenezer had been left alone during
the holidays, forgotten by his father. Then they saw Fezziwig's warehouse, where
the young Scrooge had been apprenticed. Old Fezziwig called out to his apprentices,
"Yo ho, my boys! No more work tonight. Christmas Eve, Dick. Christmas, Ebenezer!"
The warehouse was transformed into a ballroom, and everyone danced with joy.

"A small matter," said the Ghost, "to make these silly folks so full of gratitude."
Scrooge remembered how happy Fezziwig had made everyone with so little expense.`;

const STAVE_3 = `The Ghost of Christmas Present showed Scrooge the home of Bob Cratchit. The family
was poor but happy. Mrs Cratchit set the table while the children helped. Then came
Tiny Tim, Bob Cratchit's youngest son, who bore a little crutch. "God bless us,
every one!" said Tiny Tim. Scrooge asked the Spirit if Tiny Tim would live. "I see
a vacant seat," replied the Ghost, "and a crutch without an owner." Scrooge was
overcome with grief and said, "Oh, no, kind Spirit! Say he will be spared."`;

// --- Mock extractor with realistic results ---

function createMockExtractor(): LLMExtractor {
  const extractions: Record<string, ExtractionResult> = {
    marley: {
      entities: [
        { name: 'Scrooge', type: 'CHARACTER', description: 'Ebenezer Scrooge, a miserly old man' },
        {
          name: 'Marley',
          type: 'CHARACTER',
          description: "Jacob Marley, Scrooge's deceased business partner",
        },
        { name: 'Bob Cratchit', type: 'CHARACTER', description: "Scrooge's underpaid clerk" },
        { name: 'Scrooge and Marley', type: 'BUSINESS', description: 'The counting-house firm' },
      ],
      relations: [
        {
          source: 'Scrooge',
          target: 'Marley',
          type: 'PARTNERS_WITH',
          description: 'Business partners',
          keywords: ['business', 'partnership'],
        },
        {
          source: 'Scrooge',
          target: 'Bob Cratchit',
          type: 'EMPLOYS',
          description: 'Scrooge employs Bob Cratchit as his clerk',
          keywords: ['employment', 'clerk'],
        },
        {
          source: 'Scrooge',
          target: 'Scrooge and Marley',
          type: 'OWNS',
          description: 'Scrooge runs the firm',
          keywords: ['business', 'ownership'],
        },
      ],
    },
    fezziwig: {
      entities: [
        {
          name: 'Ghost of Christmas Past',
          type: 'SPIRIT',
          description: 'The first of three spirits visiting Scrooge',
        },
        { name: 'Fezziwig', type: 'CHARACTER', description: "Scrooge's kind former employer" },
        {
          name: 'Scrooge',
          type: 'CHARACTER',
          description: 'Ebenezer Scrooge as a young apprentice',
        },
      ],
      relations: [
        {
          source: 'Ghost of Christmas Past',
          target: 'Scrooge',
          type: 'VISITS',
          description: 'The ghost shows Scrooge his past',
          keywords: ['ghost', 'past', 'memory'],
        },
        {
          source: 'Fezziwig',
          target: 'Scrooge',
          type: 'EMPLOYS',
          description: 'Fezziwig employed young Scrooge as apprentice',
          keywords: ['apprentice', 'employment'],
        },
      ],
    },
    tiny_tim: {
      entities: [
        {
          name: 'Ghost of Christmas Present',
          type: 'SPIRIT',
          description: 'The second spirit visiting Scrooge',
        },
        { name: 'Tiny Tim', type: 'CHARACTER', description: "Bob Cratchit's ill youngest son" },
        { name: 'Mrs Cratchit', type: 'CHARACTER', description: "Bob Cratchit's wife" },
        {
          name: 'Bob Cratchit',
          type: 'CHARACTER',
          description: "Scrooge's clerk and Tiny Tim's father",
        },
      ],
      relations: [
        {
          source: 'Ghost of Christmas Present',
          target: 'Scrooge',
          type: 'VISITS',
          description: 'Shows Scrooge the Cratchit home',
          keywords: ['ghost', 'present', 'christmas'],
        },
        {
          source: 'Bob Cratchit',
          target: 'Tiny Tim',
          type: 'PARENT_OF',
          description: "Bob is Tiny Tim's father",
          keywords: ['family', 'father', 'son'],
        },
        {
          source: 'Bob Cratchit',
          target: 'Mrs Cratchit',
          type: 'MARRIED_TO',
          description: 'Bob and Mrs Cratchit are married',
          keywords: ['family', 'marriage'],
        },
      ],
    },
  };

  return {
    async extractEntities(content: string): Promise<ExtractionResult> {
      if (content.includes('Fezziwig')) return extractions.fezziwig;
      if (content.includes('Tiny Tim')) return extractions.tiny_tim;
      return extractions.marley;
    },
  };
}

// --- Test setup ---

const testDir = join(tmpdir(), `flowrag-e2e-${Date.now()}`);
const contentDir = join(testDir, 'content');

const schema = defineSchema({
  entityTypes: ['CHARACTER', 'SPIRIT', 'BUSINESS', 'PLACE'] as const,
  relationTypes: ['EMPLOYS', 'PARTNERS_WITH', 'VISITS', 'OWNS', 'PARENT_OF', 'MARRIED_TO'] as const,
});

describe('E2E: A Christmas Carol', () => {
  let rag: ReturnType<typeof createFlowRAG>;
  let graphStorage: SQLiteGraphStorage;

  beforeAll(async () => {
    // Write test documents
    await mkdir(contentDir, { recursive: true });
    await writeFile(join(contentDir, 'stave-1.md'), STAVE_1);
    await writeFile(join(contentDir, 'stave-2.md'), STAVE_2);
    await writeFile(join(contentDir, 'stave-3.md'), STAVE_3);

    graphStorage = new SQLiteGraphStorage({ path: join(testDir, 'graph.db') });

    rag = createFlowRAG({
      schema,
      storage: {
        kv: new JsonKVStorage({ path: join(testDir, 'kv') }),
        vector: new LanceDBVectorStorage({ path: join(testDir, 'vectors') }),
        graph: graphStorage,
      },
      embedder: new LocalEmbedder({ device: 'cpu' }),
      extractor: createMockExtractor(),
    });

    // Index all documents
    await rag.index([
      join(contentDir, 'stave-1.md'),
      join(contentDir, 'stave-2.md'),
      join(contentDir, 'stave-3.md'),
    ]);
  });

  afterAll(async () => {
    graphStorage.close();
    await rm(testDir, { recursive: true, force: true });
  });

  it('should have indexed documents and chunks', async () => {
    const stats = await rag.stats();
    expect(stats.documents).toBe(3);
    expect(stats.chunks).toBeGreaterThanOrEqual(3);
    expect(stats.vectors).toBeGreaterThanOrEqual(3);
  });

  it('should have extracted entities into the graph', async () => {
    const stats = await rag.stats();
    expect(stats.entities).toBeGreaterThanOrEqual(5);
    expect(stats.relations).toBeGreaterThanOrEqual(3);
  });

  it('should find Scrooge-related content via naive search', async () => {
    const results = await rag.search('Scrooge the miser', { mode: 'naive', limit: 3 });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].content).toBeTruthy();
    expect(results[0].score).toBeGreaterThanOrEqual(0);
  });

  it('should find Tiny Tim content via naive search', async () => {
    const results = await rag.search('Tiny Tim and his illness', { mode: 'naive', limit: 3 });
    expect(results.length).toBeGreaterThan(0);

    const allContent = results.map((r) => r.content).join(' ');
    expect(allContent.toLowerCase()).toContain('tiny tim');
  });

  it('should traverse graph from Bob Cratchit', async () => {
    const downstream = await rag.traceDataFlow('Bob Cratchit', 'downstream');
    expect(downstream.length).toBeGreaterThanOrEqual(1);

    const names = downstream.map((e) => e.name);
    expect(names).toContain('Bob Cratchit');
  });

  it('should find path between Scrooge and Tiny Tim', async () => {
    const path = await rag.findPath('Scrooge', 'Tiny Tim');
    // Scrooge → EMPLOYS → Bob Cratchit → PARENT_OF → Tiny Tim
    expect(path.length).toBeGreaterThanOrEqual(1);
  });

  it('should return results with correct structure', async () => {
    const results = await rag.search('Christmas ghosts', { mode: 'naive', limit: 1 });
    expect(results.length).toBeGreaterThan(0);

    const result = results[0];
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('content');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('source');
    expect(typeof result.id).toBe('string');
    expect(typeof result.content).toBe('string');
    expect(typeof result.score).toBe('number');
  });

  // --- Query modes ---

  it('should search with local mode (entity-focused)', async () => {
    const results = await rag.search('Scrooge the miser', { mode: 'local', limit: 5 });
    // Local mode filters by entity relevance — may return fewer results
    expect(results).toBeDefined();
    if (results.length > 0) {
      const content = results
        .map((r) => r.content)
        .join(' ')
        .toLowerCase();
      expect(content).toContain('scrooge');
    }
  });

  it('should search with global mode', async () => {
    const results = await rag.search('Christmas spirits and ghosts', { mode: 'global', limit: 5 });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].source).toBe('vector');
  });

  it('should search with hybrid mode', async () => {
    const results = await rag.search('Bob Cratchit family', { mode: 'hybrid', limit: 5 });
    expect(results.length).toBeGreaterThan(0);
  });

  // --- Graph details ---

  it('should have correct entity types in graph', async () => {
    const entities = await graphStorage.getEntities();
    const types = new Set(entities.map((e) => e.type));
    expect(types).toContain('CHARACTER');
    expect(types).toContain('SPIRIT');
  });

  it('should have correct relation types in graph', async () => {
    const entities = await graphStorage.getEntities();
    const allRelations = await Promise.all(entities.map((e) => graphStorage.getRelations(e.id)));
    const types = new Set(allRelations.flat().map((r) => r.type));
    expect(types).toContain('EMPLOYS');
    expect(types).toContain('PARENT_OF');
  });

  it('should have Scrooge connected to multiple entities', async () => {
    const relations = await graphStorage.getRelations('Scrooge', 'out');
    expect(relations.length).toBeGreaterThanOrEqual(2);
    const targets = relations.map((r) => r.targetId);
    expect(targets).toContain('Marley');
    expect(targets).toContain('Bob Cratchit');
  });
});

// --- Hook: onEntitiesExtracted ---

describe('E2E: Pipeline hooks', () => {
  const hookDir = join(tmpdir(), `flowrag-e2e-hook-${Date.now()}`);
  let hookRag: ReturnType<typeof createFlowRAG>;
  let hookGraph: SQLiteGraphStorage;

  beforeAll(async () => {
    await mkdir(join(hookDir, 'content'), { recursive: true });
    await writeFile(join(hookDir, 'content', 'stave-1.md'), STAVE_1);

    hookGraph = new SQLiteGraphStorage({ path: join(hookDir, 'graph.db') });

    hookRag = createFlowRAG({
      schema,
      storage: {
        kv: new JsonKVStorage({ path: join(hookDir, 'kv') }),
        vector: new LanceDBVectorStorage({ path: join(hookDir, 'vectors') }),
        graph: hookGraph,
      },
      embedder: new LocalEmbedder({ device: 'cpu' }),
      extractor: createMockExtractor(),
      hooks: {
        onEntitiesExtracted: async (extraction, _context) => {
          // Filter out BUSINESS entities, keep only CHARACTERs
          return {
            entities: extraction.entities.filter((e) => e.type === 'CHARACTER'),
            relations: extraction.relations.filter((r) => {
              const keptNames = new Set(
                extraction.entities.filter((e) => e.type === 'CHARACTER').map((e) => e.name),
              );
              return keptNames.has(r.source) && keptNames.has(r.target);
            }),
          };
        },
      },
    });

    await hookRag.index(join(hookDir, 'content', 'stave-1.md'));
  });

  afterAll(async () => {
    hookGraph.close();
    await rm(hookDir, { recursive: true, force: true });
  });

  it('should have filtered out BUSINESS entities via hook', async () => {
    const entities = await hookGraph.getEntities();
    const types = entities.map((e) => e.type);
    expect(types).not.toContain('BUSINESS');
    expect(types).toContain('CHARACTER');
  });

  it('should have filtered out relations to removed entities', async () => {
    const entity = await hookGraph.getEntity('Scrooge');
    expect(entity).not.toBeNull();

    const relations = await hookGraph.getRelations('Scrooge', 'out');
    const targets = relations.map((r) => r.targetId);
    // "Scrooge and Marley" (BUSINESS) was filtered, so OWNS relation should be gone
    expect(targets).not.toContain('Scrooge and Marley');
  });

  it('should still have valid CHARACTER relations', async () => {
    const relations = await hookGraph.getRelations('Scrooge', 'out');
    expect(relations.length).toBeGreaterThanOrEqual(1);
    // Scrooge → EMPLOYS → Bob Cratchit should survive
    const targets = relations.map((r) => r.targetId);
    expect(targets).toContain('Bob Cratchit');
  });

  it('should provide chunk context to hook', async () => {
    // Re-index with a hook that captures context
    const contexts: Array<{ chunkId: string; documentId: string; content: string }> = [];
    const captureDir = join(tmpdir(), `flowrag-e2e-capture-${Date.now()}`);
    await mkdir(join(captureDir, 'content'), { recursive: true });
    await writeFile(join(captureDir, 'content', 'test.md'), 'Test content for context capture.');

    const captureGraph = new SQLiteGraphStorage({ path: join(captureDir, 'graph.db') });
    const captureRag = createFlowRAG({
      schema,
      storage: {
        kv: new JsonKVStorage({ path: join(captureDir, 'kv') }),
        vector: new LanceDBVectorStorage({ path: join(captureDir, 'vectors') }),
        graph: captureGraph,
      },
      embedder: new LocalEmbedder({ device: 'cpu' }),
      extractor: createMockExtractor(),
      hooks: {
        onEntitiesExtracted: async (extraction, context) => {
          contexts.push(context);
          return extraction;
        },
      },
    });

    await captureRag.index(join(captureDir, 'content', 'test.md'));
    captureGraph.close();
    await rm(captureDir, { recursive: true, force: true });

    expect(contexts.length).toBeGreaterThanOrEqual(1);
    expect(contexts[0].chunkId).toMatch(/^chunk:/);
    expect(contexts[0].documentId).toMatch(/^doc:/);
    expect(contexts[0].content).toBeTruthy();
  });
});
