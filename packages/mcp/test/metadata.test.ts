import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { FlowRAGMcpConfig } from '../src/config.js';
import {
  detectConfigChanges,
  getConfigHash,
  readMetadata,
  writeMetadata,
} from '../src/metadata.js';

const baseConfig: FlowRAGMcpConfig = {
  data: './data',
  schema: {
    entityTypes: ['SERVICE', 'DATABASE'],
    relationTypes: ['USES', 'PRODUCES'],
  },
  embedder: { provider: 'local' },
  extractor: { provider: 'gemini' },
  transport: 'stdio',
  port: 3000,
};

async function readMetadataOrFail(path: string) {
  const meta = await readMetadata(path);
  expect(meta).not.toBeNull();
  return meta as NonNullable<typeof meta>;
}

describe('metadata', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'flowrag-mcp-meta-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('getConfigHash', () => {
    it('returns consistent hash for same config', () => {
      expect(getConfigHash(baseConfig)).toBe(getConfigHash(baseConfig));
    });

    it('returns different hash when embedder changes', () => {
      const changed = { ...baseConfig, embedder: { provider: 'gemini' } };
      expect(getConfigHash(changed)).not.toBe(getConfigHash(baseConfig));
    });

    it('ignores non-relevant fields like data path', () => {
      const changed = { ...baseConfig, data: '/other/path' };
      expect(getConfigHash(changed)).toBe(getConfigHash(baseConfig));
    });
  });

  describe('readMetadata / writeMetadata', () => {
    it('returns null when no metadata file exists', async () => {
      expect(await readMetadata(tempDir)).toBeNull();
    });

    it('writes and reads metadata', async () => {
      await writeMetadata(tempDir, baseConfig, 42);
      const meta = await readMetadataOrFail(tempDir);

      expect(meta.documentCount).toBe(42);
      expect(meta.embedder.provider).toBe('local');
      expect(meta.extractor.provider).toBe('gemini');
      expect(meta.schema.entityTypes).toEqual(['SERVICE', 'DATABASE']);
      expect(meta.lastIndexedAt).toBeTruthy();
      expect(meta.configHash).toBe(getConfigHash(baseConfig));
    });
  });

  describe('detectConfigChanges', () => {
    it('returns empty array when config matches', async () => {
      await writeMetadata(tempDir, baseConfig, 10);
      const meta = await readMetadataOrFail(tempDir);
      expect(detectConfigChanges(baseConfig, meta)).toEqual([]);
    });

    it('detects breaking embedder change', async () => {
      await writeMetadata(tempDir, baseConfig, 10);
      const meta = await readMetadataOrFail(tempDir);

      const changed = { ...baseConfig, embedder: { provider: 'gemini' } };
      const changes = detectConfigChanges(changed, meta);

      expect(changes).toHaveLength(1);
      expect(changes[0].severity).toBe('breaking');
      expect(changes[0].message).toContain('Embedder changed');
    });

    it('detects minor schema change', async () => {
      await writeMetadata(tempDir, baseConfig, 10);
      const meta = await readMetadataOrFail(tempDir);

      const changed = {
        ...baseConfig,
        schema: { ...baseConfig.schema, entityTypes: ['SERVICE', 'DATABASE', 'NEW'] },
      };
      const changes = detectConfigChanges(changed, meta);

      expect(changes).toHaveLength(1);
      expect(changes[0].severity).toBe('minor');
      expect(changes[0].message).toContain('Schema changed');
    });

    it('detects minor extractor change', async () => {
      await writeMetadata(tempDir, baseConfig, 10);
      const meta = await readMetadataOrFail(tempDir);

      const changed = { ...baseConfig, extractor: { provider: 'bedrock' } };
      const changes = detectConfigChanges(changed, meta);

      expect(changes).toHaveLength(1);
      expect(changes[0].severity).toBe('minor');
      expect(changes[0].message).toContain('Extractor changed');
    });

    it('detects multiple changes at once', async () => {
      await writeMetadata(tempDir, baseConfig, 10);
      const meta = await readMetadataOrFail(tempDir);

      const changed = {
        ...baseConfig,
        embedder: { provider: 'gemini' },
        extractor: { provider: 'bedrock' },
      };
      const changes = detectConfigChanges(changed, meta);

      expect(changes).toHaveLength(2);
    });
  });
});
