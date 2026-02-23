import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { config as loadDotenv } from 'dotenv';

export interface FlowRAGMcpConfig {
  data: string;
  docs?: string;
  schema: SchemaConfig;
  namespace?: string;
  storage?: StorageConfig;
  embedder: ProviderConfig;
  extractor: ProviderConfig;
  transport: 'stdio' | 'http';
  port: number;
  auth?: AuthConfig;
}

export interface StorageConfig {
  kv?: KVStorageConfig;
  vector?: VectorStorageConfig;
  graph?: GraphStorageConfig;
}

export interface KVStorageConfig {
  provider: 'json' | 's3' | 'redis';
  url?: string;
  bucket?: string;
  prefix?: string;
  region?: string;
}

export interface VectorStorageConfig {
  provider: 'lancedb' | 'opensearch' | 'redis';
  node?: string;
  dimensions?: number;
  url?: string;
}

export interface GraphStorageConfig {
  provider: 'sqlite' | 'opensearch';
  node?: string;
}

export interface AuthConfig {
  token: string;
}

export interface SchemaConfig {
  entityTypes: string[];
  relationTypes: string[];
  documentFields?: Record<string, FieldConfig>;
  entityFields?: Record<string, FieldConfig>;
  relationFields?: Record<string, FieldConfig>;
}

export interface FieldConfig {
  type: 'string' | 'enum';
  values?: string[];
  default?: string;
  filterable?: boolean;
}

export interface ProviderConfig {
  provider: string;
  model?: string;
}

export interface CliFlags {
  config?: string;
  data?: string;
  docs?: string;
}

const DEFAULT_CONFIG: FlowRAGMcpConfig = {
  data: './data',
  schema: {
    entityTypes: ['SERVICE', 'DATABASE', 'PROTOCOL', 'TEAM', 'CONCEPT'],
    relationTypes: ['USES', 'PRODUCES', 'CONSUMES', 'OWNS', 'DEPENDS_ON'],
  },
  embedder: { provider: 'local' },
  extractor: { provider: 'gemini' },
  transport: 'stdio',
  port: 3000,
};

export async function loadConfig(flags: CliFlags = {}): Promise<FlowRAGMcpConfig> {
  const configPath = flags.config ?? './flowrag.config.json';
  const fileConfig = await loadConfigFile(configPath);

  // Load .env from config file directory, then cwd
  const envDir = fileConfig ? dirname(resolve(configPath)) : process.cwd();
  loadDotenv({ path: resolve(envDir, '.env') });
  loadDotenv({ path: resolve(process.cwd(), '.env') });

  // Merge: defaults < config file < CLI flags
  const merged: FlowRAGMcpConfig = {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    data: flags.data ?? fileConfig?.data ?? DEFAULT_CONFIG.data,
    schema: {
      ...DEFAULT_CONFIG.schema,
      ...fileConfig?.schema,
    },
    embedder: fileConfig?.embedder ?? DEFAULT_CONFIG.embedder,
    extractor: fileConfig?.extractor ?? DEFAULT_CONFIG.extractor,
    transport: fileConfig?.transport ?? DEFAULT_CONFIG.transport,
    port: fileConfig?.port ?? DEFAULT_CONFIG.port,
  };

  if (flags.docs) {
    merged.docs = flags.docs;
  }

  if (fileConfig?.storage) {
    merged.storage = fileConfig.storage;
  }

  if (fileConfig?.auth) {
    merged.auth = { token: resolveEnvVars(fileConfig.auth.token) };
  }

  return merged;
}

export function resolveEnvVars(value: string): string {
  return value.replace(/\$\{(\w+)\}/g, (_, name) => process.env[name] ?? '');
}

async function loadConfigFile(path: string): Promise<Partial<FlowRAGMcpConfig> | null> {
  try {
    const content = await readFile(resolve(path), 'utf-8');
    return JSON.parse(content);
  } catch {
    // Config file is optional — return null if not found
    return null;
  }
}
