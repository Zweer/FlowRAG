import { Command } from '@commander-js/extra-typings';

import { getFlowRAG } from '../rag.js';

export const indexCommand = new Command('index')
  .description('Index documents from a directory')
  .argument('<path>', 'path to documents directory')
  .option('-d, --data <path>', 'data storage path', './data')
  .option('-f, --force', 'force re-index all documents')
  .action(async (inputPath, options) => {
    const rag = getFlowRAG(options.data);

    console.log(`📄 Indexing documents from: ${inputPath}`);

    await rag.index(inputPath);

    const stats = await rag.stats();
    console.log(`✅ Indexed ${stats.documents} documents, ${stats.chunks} chunks`);
    console.log(`   ${stats.entities} entities, ${stats.relations} relations`);
  });
