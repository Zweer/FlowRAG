import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { defineSchema } from '@flowrag/core';
import type { FlowRAG, FlowRAGHooks } from '@flowrag/pipeline';
import { createFlowRAG } from '@flowrag/pipeline';
import type { LocalStorageConfig } from '@flowrag/presets';
import { createLocalStorage } from '@flowrag/presets';

export interface FlowRAGInstance {
  rag: FlowRAG;
  config: LocalStorageConfig;
}

interface FlowRAGConfigFile {
  entityTypes?: string[];
  relationTypes?: string[];
  documentFields?: Record<string, unknown>;
  entityFields?: Record<string, unknown>;
  relationFields?: Record<string, unknown>;
}

const CONFIG_FILES = ['flowrag.json', '.flowrag.json'];

let instance: FlowRAGInstance | null = null;

function loadConfig(dataPath: string): FlowRAGConfigFile {
  const searchDirs = [process.cwd(), resolve(dataPath)];

  for (const dir of searchDirs) {
    for (const file of CONFIG_FILES) {
      const configPath = join(dir, file);
      if (existsSync(configPath)) {
        return JSON.parse(readFileSync(configPath, 'utf-8')) as FlowRAGConfigFile;
      }
    }
  }

  return {};
}

export function getFlowRAG(dataPath: string, hooks?: FlowRAGHooks): FlowRAGInstance {
  if (!instance) {
    const cfg = loadConfig(dataPath);

    const schema = defineSchema({
      entityTypes: cfg.entityTypes?.length ? cfg.entityTypes : ['ENTITY'],
      relationTypes: cfg.relationTypes?.length ? cfg.relationTypes : ['RELATES_TO'],
      ...(cfg.documentFields ? { documentFields: cfg.documentFields } : {}),
      ...(cfg.entityFields ? { entityFields: cfg.entityFields } : {}),
      ...(cfg.relationFields ? { relationFields: cfg.relationFields } : {}),
    });

    const config = createLocalStorage({ path: dataPath });

    instance = {
      rag: createFlowRAG({ schema, ...config, hooks }),
      config,
    };
  }

  return instance;
}

/** Reset singleton (for testing) */
export function resetFlowRAG(): void {
  instance = null;
}
