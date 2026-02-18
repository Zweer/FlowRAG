import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { FlowRAGMcpConfig } from './config.js';

export interface FlowRAGMetadata {
  configHash: string;
  embedder: {
    provider: string;
    model?: string;
  };
  extractor: {
    provider: string;
    model?: string;
  };
  schema: {
    entityTypes: string[];
    relationTypes: string[];
  };
  lastIndexedAt: string;
  documentCount: number;
}

export type ConfigChange =
  | { severity: 'breaking'; message: string }
  | { severity: 'minor'; message: string };

const META_FILENAME = 'flowrag.meta.json';

export function getConfigHash(config: FlowRAGMcpConfig): string {
  const relevant = {
    embedder: config.embedder,
    extractor: config.extractor,
    schema: {
      entityTypes: config.schema.entityTypes,
      relationTypes: config.schema.relationTypes,
    },
  };
  return createHash('sha256').update(JSON.stringify(relevant)).digest('hex').slice(0, 8);
}

export async function readMetadata(dataPath: string): Promise<FlowRAGMetadata | null> {
  try {
    const content = await readFile(join(dataPath, META_FILENAME), 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function writeMetadata(
  dataPath: string,
  config: FlowRAGMcpConfig,
  documentCount: number,
): Promise<void> {
  const metadata: FlowRAGMetadata = {
    configHash: getConfigHash(config),
    embedder: config.embedder,
    extractor: config.extractor,
    schema: {
      entityTypes: config.schema.entityTypes,
      relationTypes: config.schema.relationTypes,
    },
    lastIndexedAt: new Date().toISOString(),
    documentCount,
  };

  await writeFile(join(dataPath, META_FILENAME), JSON.stringify(metadata, null, 2));
}

export function detectConfigChanges(
  config: FlowRAGMcpConfig,
  metadata: FlowRAGMetadata,
): ConfigChange[] {
  const changes: ConfigChange[] = [];

  if (
    config.embedder.provider !== metadata.embedder.provider ||
    config.embedder.model !== metadata.embedder.model
  ) {
    changes.push({
      severity: 'breaking',
      message: 'Embedder changed. Re-index required (force: true).',
    });
  }

  const entityTypesChanged =
    JSON.stringify(config.schema.entityTypes.slice().sort()) !==
    JSON.stringify(metadata.schema.entityTypes.slice().sort());
  const relationTypesChanged =
    JSON.stringify(config.schema.relationTypes.slice().sort()) !==
    JSON.stringify(metadata.schema.relationTypes.slice().sort());

  if (entityTypesChanged || relationTypesChanged) {
    changes.push({
      severity: 'minor',
      message: 'Schema changed. New types will apply to next indexing.',
    });
  }

  if (
    config.extractor.provider !== metadata.extractor.provider ||
    config.extractor.model !== metadata.extractor.model
  ) {
    changes.push({
      severity: 'minor',
      message: 'Extractor changed. New extractions may differ.',
    });
  }

  return changes;
}
