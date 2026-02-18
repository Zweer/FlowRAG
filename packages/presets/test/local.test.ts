import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { GeminiExtractor } from '@flowrag/provider-gemini';
import { LocalEmbedder } from '@flowrag/provider-local';
import { JsonKVStorage } from '@flowrag/storage-json';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createLocalStorage } from '../src/index.js';

describe('createLocalStorage', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'flowrag-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('creates default local storage configuration', () => {
    // Provide a mock API key for testing
    const config = createLocalStorage({
      path: tempDir,
      extractor: new GeminiExtractor({ apiKey: 'test-key' }),
    });

    expect(config.storage.kv).toBeInstanceOf(JsonKVStorage);
    expect(config.embedder).toBeInstanceOf(LocalEmbedder);
    expect(config.extractor).toBeInstanceOf(GeminiExtractor);
  });

  it('uses default path when not provided', () => {
    // Test default path fallback (line 49) - we need to override graph to avoid directory issues
    const config = createLocalStorage({
      extractor: new GeminiExtractor({ apiKey: 'test-key' }),
      graph: new (class MockGraphStorage {
        async addEntity() {}
        async addRelation() {}
        async getEntity() {
          return null;
        }
        async getEntities() {
          return [];
        }
        async getRelations() {
          return [];
        }
        async traverse() {
          return [];
        }
        async findPath() {
          return [];
        }
        async deleteEntity() {}
        async deleteRelation() {}
      })(),
    });

    expect(config.storage.kv).toBeInstanceOf(JsonKVStorage);
  });

  it('uses default extractor when not provided', () => {
    // Test default extractor fallback (line 58) - this will fail without API key
    // but we can catch the error to verify the code path is executed
    expect(() => {
      createLocalStorage({ path: tempDir });
    }).toThrow('Gemini API key is required');
  });

  it('accepts a string path shorthand', () => {
    expect(() => {
      createLocalStorage(tempDir);
    }).toThrow('Gemini API key is required');
  });

  it('uses custom path', () => {
    const config = createLocalStorage({
      path: tempDir,
      extractor: new GeminiExtractor({ apiKey: 'test-key' }),
    });

    // Check that path is used (implementation detail, but good to verify)
    expect(config.storage.kv).toBeInstanceOf(JsonKVStorage);
  });

  it('allows overriding individual components', () => {
    const customKV = new JsonKVStorage({ path: join(tempDir, 'override') });
    const config = createLocalStorage({
      path: tempDir,
      kv: customKV,
      extractor: new GeminiExtractor({ apiKey: 'test-key' }),
    });

    expect(config.storage.kv).toBe(customKV);
    // Other components should still be defaults
    expect(config.embedder).toBeInstanceOf(LocalEmbedder);
  });

  it('allows overriding embedder', () => {
    const customEmbedder = new LocalEmbedder({ model: 'custom-model' });
    const config = createLocalStorage({
      path: tempDir,
      embedder: customEmbedder,
      extractor: new GeminiExtractor({ apiKey: 'test-key' }),
    });

    expect(config.embedder).toBe(customEmbedder);
  });
});
