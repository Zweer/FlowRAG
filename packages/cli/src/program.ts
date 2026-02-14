import { Command } from '@commander-js/extra-typings';

import { graphCommand } from './commands/graph.js';
import { indexCommand } from './commands/index.js';
import { initCommand } from './commands/init.js';
import { searchCommand } from './commands/search.js';
import { statsCommand } from './commands/stats.js';

export const program: Command = new Command()
  .name('flowrag')
  .description('FlowRAG CLI - index documents and search with knowledge graph support')
  .version('0.0.0')
  .addCommand(initCommand)
  .addCommand(indexCommand)
  .addCommand(searchCommand)
  .addCommand(statsCommand)
  .addCommand(graphCommand);
