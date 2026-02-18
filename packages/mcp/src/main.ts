import { parseArgs } from 'node:util';

import { loadConfig } from './config.js';
import { createRagFromConfig } from './factory.js';
import { detectConfigChanges, readMetadata } from './metadata.js';
import { createServer } from './server.js';

export async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      config: { type: 'string' },
      data: { type: 'string' },
      docs: { type: 'string' },
    },
    strict: false,
  });

  const config = await loadConfig(values);
  const { rag, graph } = createRagFromConfig(config);

  // Check for config changes
  const metadata = await readMetadata(config.data);
  if (metadata) {
    const changes = detectConfigChanges(config, metadata);
    for (const change of changes) {
      const prefix = change.severity === 'breaking' ? '⛔' : '⚠️';
      console.error(`${prefix} ${change.message}`);
    }
  }

  await createServer(rag, graph, config);
}
