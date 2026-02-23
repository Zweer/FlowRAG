import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadConfig, resolveEnvVars } from '../src/config.js';

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

  it('loads storage config from file', async () => {
    const configFile = join(tempDir, 'flowrag.config.json');
    await writeFile(
      configFile,
      JSON.stringify({
        storage: {
          kv: { provider: 'redis', url: 'redis://localhost:6379' },
          vector: { provider: 'opensearch', node: 'https://os:9200', dimensions: 1024 },
          graph: { provider: 'opensearch', node: 'https://os:9200' },
        },
      }),
    );

    const config = await loadConfig({ config: configFile });

    expect(config.storage?.kv?.provider).toBe('redis');
    expect(config.storage?.kv?.url).toBe('redis://localhost:6379');
    expect(config.storage?.vector?.provider).toBe('opensearch');
    expect(config.storage?.vector?.dimensions).toBe(1024);
    expect(config.storage?.graph?.provider).toBe('opensearch');
  });

  it('loads auth config with env var interpolation', async () => {
    process.env.TEST_AUTH_TOKEN = 'my-secret';
    const configFile = join(tempDir, 'flowrag.config.json');
    await writeFile(
      configFile,
      JSON.stringify({
        // biome-ignore lint/suspicious/noTemplateCurlyInString: testing env var interpolation
        auth: { token: '${TEST_AUTH_TOKEN}' },
      }),
    );

    const config = await loadConfig({ config: configFile });

    expect(config.auth?.token).toBe('my-secret');
    delete process.env.TEST_AUTH_TOKEN;
  });

  it('resolves missing env var to empty string', async () => {
    delete process.env.NONEXISTENT_VAR;
    const configFile = join(tempDir, 'flowrag.config.json');
    await writeFile(
      configFile,
      JSON.stringify({
        // biome-ignore lint/suspicious/noTemplateCurlyInString: testing env var interpolation
        auth: { token: '${NONEXISTENT_VAR}' },
      }),
    );

    const config = await loadConfig({ config: configFile });

    expect(config.auth?.token).toBe('');
  });

  it('does not set storage or auth when not in config file', async () => {
    const configFile = join(tempDir, 'flowrag.config.json');
    await writeFile(configFile, JSON.stringify({}));

    const config = await loadConfig({ config: configFile });

    expect(config.storage).toBeUndefined();
    expect(config.auth).toBeUndefined();
  });
});

describe('resolveEnvVars', () => {
  it('replaces env var with value', () => {
    process.env.MY_VAR = 'hello';
    // biome-ignore lint/suspicious/noTemplateCurlyInString: testing env var interpolation
    expect(resolveEnvVars('prefix-${MY_VAR}-suffix')).toBe('prefix-hello-suffix');
    delete process.env.MY_VAR;
  });

  it('replaces multiple vars', () => {
    process.env.A = '1';
    process.env.B = '2';
    // biome-ignore lint/suspicious/noTemplateCurlyInString: testing env var interpolation
    expect(resolveEnvVars('${A}-${B}')).toBe('1-2');
    delete process.env.A;
    delete process.env.B;
  });

  it('returns string unchanged when no vars', () => {
    expect(resolveEnvVars('plain-token')).toBe('plain-token');
  });
});
