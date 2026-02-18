import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'flowrag-mcp-config-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns defaults when no config file exists', async () => {
    const config = await loadConfig({ config: join(tempDir, 'nonexistent.json') });

    expect(config.data).toBe('./data');
    expect(config.transport).toBe('stdio');
    expect(config.port).toBe(3000);
    expect(config.embedder.provider).toBe('local');
    expect(config.extractor.provider).toBe('gemini');
    expect(config.schema.entityTypes).toContain('SERVICE');
    expect(config.schema.relationTypes).toContain('USES');
    expect(config.docs).toBeUndefined();
  });

  it('loads config from file', async () => {
    const configFile = join(tempDir, 'flowrag.config.json');
    await writeFile(
      configFile,
      JSON.stringify({
        data: './custom-data',
        docs: './my-docs',
        schema: {
          entityTypes: ['WIDGET'],
          relationTypes: ['CONNECTS'],
        },
        embedder: { provider: 'gemini' },
        extractor: { provider: 'bedrock', model: 'custom-model' },
        transport: 'http',
        port: 8080,
      }),
    );

    const config = await loadConfig({ config: configFile });

    expect(config.data).toBe('./custom-data');
    expect(config.docs).toBe('./my-docs');
    expect(config.schema.entityTypes).toEqual(['WIDGET']);
    expect(config.schema.relationTypes).toEqual(['CONNECTS']);
    expect(config.embedder.provider).toBe('gemini');
    expect(config.extractor.provider).toBe('bedrock');
    expect(config.extractor.model).toBe('custom-model');
    expect(config.transport).toBe('http');
    expect(config.port).toBe(8080);
  });

  it('CLI flags override config file', async () => {
    const configFile = join(tempDir, 'flowrag.config.json');
    await writeFile(
      configFile,
      JSON.stringify({
        data: './file-data',
        docs: './file-docs',
      }),
    );

    const config = await loadConfig({
      config: configFile,
      data: './cli-data',
      docs: './cli-docs',
    });

    expect(config.data).toBe('./cli-data');
    expect(config.docs).toBe('./cli-docs');
  });

  it('CLI flags work without config file', async () => {
    const config = await loadConfig({
      config: join(tempDir, 'nope.json'),
      data: './my-data',
      docs: './my-docs',
    });

    expect(config.data).toBe('./my-data');
    expect(config.docs).toBe('./my-docs');
    expect(config.embedder.provider).toBe('local');
  });

  it('loads .env file from config directory', async () => {
    const configFile = join(tempDir, 'flowrag.config.json');
    await writeFile(configFile, JSON.stringify({}));
    await writeFile(join(tempDir, '.env'), 'TEST_MCP_VAR=hello\n');

    await loadConfig({ config: configFile });

    expect(process.env.TEST_MCP_VAR).toBe('hello');
    delete process.env.TEST_MCP_VAR;
  });

  it('merges partial schema with defaults', async () => {
    const configFile = join(tempDir, 'flowrag.config.json');
    await writeFile(
      configFile,
      JSON.stringify({
        schema: { entityTypes: ['CUSTOM'] },
      }),
    );

    const config = await loadConfig({ config: configFile });

    expect(config.schema.entityTypes).toEqual(['CUSTOM']);
  });

  it('uses default config path when no flag provided', async () => {
    const config = await loadConfig({});
    expect(config.data).toBe('./data');
    expect(config.embedder.provider).toBe('local');
  });
});
