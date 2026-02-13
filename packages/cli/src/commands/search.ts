import { Command } from '@commander-js/extra-typings';

import { getFlowRAG } from '../rag.js';

export const searchCommand = new Command('search')
  .description('Search indexed documents')
  .argument('<query>', 'search query')
  .option('-d, --data <path>', 'data storage path', './data')
  .option('-m, --mode <mode>', 'search mode: naive, local, global, hybrid', 'hybrid')
  .option('-l, --limit <number>', 'max results', '5')
  .action(async (query, options) => {
    const rag = getFlowRAG(options.data);
    const mode = options.mode as 'naive' | 'local' | 'global' | 'hybrid';
    const limit = Number.parseInt(options.limit, 10);

    const results = await rag.search(query, { mode, limit });

    if (results.length === 0) {
      console.log('No results found.');
      return;
    }

    console.log(`🔍 ${results.length} result(s) for "${query}":\n`);

    for (const [i, result] of results.entries()) {
      console.log(`--- ${i + 1}. [${result.source}] score: ${result.score.toFixed(4)} ---`);
      console.log(result.content.slice(0, 200));
      console.log();
    }
  });
