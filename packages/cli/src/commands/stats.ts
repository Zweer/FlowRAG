import { Command } from '@commander-js/extra-typings';

import { getFlowRAG } from '../rag.js';

export const statsCommand = new Command('stats')
  .description('Show index statistics')
  .option('-d, --data <path>', 'data storage path', './data')
  .action(async (options) => {
    const { rag } = getFlowRAG(options.data);
    const stats = await rag.stats();

    console.log('📊 FlowRAG Index Stats:');
    console.log(`   Documents: ${stats.documents}`);
    console.log(`   Chunks:    ${stats.chunks}`);
    console.log(`   Entities:  ${stats.entities}`);
    console.log(`   Relations: ${stats.relations}`);
    console.log(`   Vectors:   ${stats.vectors}`);
  });
