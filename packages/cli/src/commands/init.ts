import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { Command } from '@commander-js/extra-typings';

export const initCommand = new Command('init')
  .description('Initialize FlowRAG data directory')
  .option('-d, --data <path>', 'data storage path', './data')
  .action(async (options) => {
    const dirs = ['kv', 'vectors'];
    for (const dir of dirs) {
      await mkdir(join(options.data, dir), { recursive: true });
    }

    console.log(`✅ Initialized FlowRAG at ${options.data}`);
    console.log('   Created: kv/, vectors/');
    console.log('   SQLite graph.db will be created on first index.');
  });
