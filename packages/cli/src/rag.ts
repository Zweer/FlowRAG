import { defineSchema } from '@flowrag/core';
import type { FlowRAG } from '@flowrag/pipeline';
import { createFlowRAG } from '@flowrag/pipeline';
import { createLocalStorage } from '@flowrag/presets';

let instance: FlowRAG | null = null;

export function getFlowRAG(dataPath: string): FlowRAG {
  if (!instance) {
    const schema = defineSchema({
      entityTypes: [],
      relationTypes: [],
    });

    instance = createFlowRAG({
      schema,
      ...createLocalStorage({ path: dataPath }),
    });
  }

  return instance;
}
