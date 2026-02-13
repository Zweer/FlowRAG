import { Command } from '@commander-js/extra-typings';

import { indexCommand } from './commands/index.js';
import { searchCommand } from './commands/search.js';
import { statsCommand } from './commands/stats.js';

export const program = new Command()
  .name('flowrag')
  .description('FlowRAG CLI - index documents and search with knowledge graph support')
  .version('0.0.0')
  .addCommand(indexCommand)
  .addCommand(searchCommand)
  .addCommand(statsCommand);
