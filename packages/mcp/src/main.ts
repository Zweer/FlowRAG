import { parseArgs } from 'node:util';

import type { CliFlags } from './config.js';
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

  const config = await loadConfig(values as CliFlags);
  const { rag, graph } = await createRagFromConfig(config);

  // Check for config changes
  const metadata = await readMetadata(config.data);
  if (metadata) {
    const changes = detectConfigChanges(config, metadata);
    for (const change of changes) {
      const prefix = change.severity === 'breaking' ? '⛔' : '⚠️';
      console.error(`${prefix} ${change.message}`);
    }
  }

  const handle = await createServer(rag, graph, config);

  if (config.transport === 'http') {
    const shutdown = async () => {
      console.error('Shutting down...');
      await handle.close();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }
}
