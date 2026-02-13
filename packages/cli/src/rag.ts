import { defineSchema } from '@flowrag/core';
import type { FlowRAG, FlowRAGHooks } from '@flowrag/pipeline';
import { createFlowRAG } from '@flowrag/pipeline';
import type { LocalStorageConfig } from '@flowrag/presets';
import { createLocalStorage } from '@flowrag/presets';

export interface FlowRAGInstance {
  rag: FlowRAG;
  config: LocalStorageConfig;
}

let instance: FlowRAGInstance | null = null;

export function getFlowRAG(dataPath: string, hooks?: FlowRAGHooks): FlowRAGInstance {
  if (!instance) {
    const schema = defineSchema({
      entityTypes: [],
      relationTypes: [],
    });

    const config = createLocalStorage({ path: dataPath });

    instance = {
      rag: createFlowRAG({ schema, ...config, hooks }),
      config,
    };
  }

  return instance;
}
