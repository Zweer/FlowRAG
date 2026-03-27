import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { GeminiExtractor } from '@flowrag/provider-gemini';
import { LocalEmbedder } from '@flowrag/provider-local';
import { JsonKVStorage } from '@flowrag/storage-json';
import { SQLiteGraphStorage, SQLiteVectorStorage } from '@flowrag/storage-sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createSQLiteStorage } from '../src/index.js';

describe('createSQLiteStorage', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'flowrag-test-sqlite-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('creates default SQLite storage configuration', () => {
    const config = createSQLiteStorage({
      path: tempDir,
      extractor: new GeminiExtractor({ apiKey: 'test-key' }),
    });

    expect(config.storage.kv).toBeInstanceOf(JsonKVStorage);
    expect(config.storage.vector).toBeInstanceOf(SQLiteVectorStorage);
    expect(config.storage.graph).toBeInstanceOf(SQLiteGraphStorage);
    expect(config.embedder).toBeInstanceOf(LocalEmbedder);
    expect(config.extractor).toBeInstanceOf(GeminiExtractor);
  });

  it('uses default path when not provided', () => {
    const config = createSQLiteStorage({
      extractor: new GeminiExtractor({ apiKey: 'test-key' }),
      vector: new SQLiteVectorStorage({ path: join(tempDir, 'v.db'), dimensions: 384 }),
      graph: new SQLiteGraphStorage({ path: join(tempDir, 'g.db') }),
    });

    expect(config.storage.kv).toBeInstanceOf(JsonKVStorage);
    expect(config.storage.vector).toBeInstanceOf(SQLiteVectorStorage);
  });

  it('uses default extractor when not provided', () => {
    expect(() => {
      createSQLiteStorage({ path: tempDir });
    }).toThrow('Gemini API key is required');
  });

  it('accepts a string path shorthand', () => {
    expect(() => {
      createSQLiteStorage(tempDir);
    }).toThrow('Gemini API key is required');
  });

  it('allows overriding individual components', () => {
    const customKV = new JsonKVStorage({ path: join(tempDir, 'override') });
    const config = createSQLiteStorage({
      path: tempDir,
      kv: customKV,
      extractor: new GeminiExtractor({ apiKey: 'test-key' }),
    });

    expect(config.storage.kv).toBe(customKV);
    expect(config.storage.vector).toBeInstanceOf(SQLiteVectorStorage);
  });

  it('allows overriding embedder', () => {
    const customEmbedder = new LocalEmbedder({ model: 'custom-model' });
    const config = createSQLiteStorage({
      path: tempDir,
      embedder: customEmbedder,
      extractor: new GeminiExtractor({ apiKey: 'test-key' }),
    });

    expect(config.embedder).toBe(customEmbedder);
  });

  it('allows custom dimensions', () => {
    const config = createSQLiteStorage({
      path: tempDir,
      dimensions: 1024,
      extractor: new GeminiExtractor({ apiKey: 'test-key' }),
    });

    expect(config.storage.vector).toBeInstanceOf(SQLiteVectorStorage);
  });

  it('allows overriding vector storage', () => {
    const customVector = new SQLiteVectorStorage({
      path: join(tempDir, 'custom.db'),
      dimensions: 768,
    });
    const config = createSQLiteStorage({
      path: tempDir,
      vector: customVector,
      extractor: new GeminiExtractor({ apiKey: 'test-key' }),
    });

    expect(config.storage.vector).toBe(customVector);
  });
});
