import { defineSchema } from '@flowrag/core';
import type { FlowRAG } from '@flowrag/pipeline';
import { createFlowRAG } from '@flowrag/pipeline';
import type { LocalStorageConfig } from '@flowrag/presets';
import { createLocalStorage } from '@flowrag/presets';

export interface FlowRAGInstance {
  rag: FlowRAG;
  config: LocalStorageConfig;
}

let instance: FlowRAGInstance | null = null;

export function getFlowRAG(dataPath: string): FlowRAGInstance {
  if (!instance) {
    const schema = defineSchema({
      entityTypes: [],
      relationTypes: [],
    });

    const config = createLocalStorage({ path: dataPath });

    instance = {
      rag: createFlowRAG({ schema, ...config }),
      config,
    };
  }

  return instance;
}
