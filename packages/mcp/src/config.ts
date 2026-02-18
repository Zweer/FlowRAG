import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { config as loadDotenv } from 'dotenv';

export interface FlowRAGMcpConfig {
  data: string;
  docs?: string;
  schema: SchemaConfig;
  storage?: StorageConfig;
  namespace?: string;
  embedder: ProviderConfig;
  extractor: ProviderConfig;
  transport: 'stdio' | 'http';
  port: number;
}

export interface StorageConfig {
  type: 'local' | 'redis';
  url?: string;
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

  return merged;
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
