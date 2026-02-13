import { rm } from 'node:fs/promises';

import { Command } from '@commander-js/extra-typings';

import { getFlowRAG } from '../rag.js';
import { reviewExtraction } from '../review.js';

export const indexCommand = new Command('index')
  .description('Index documents from a directory')
  .argument('<path>', 'path to documents directory')
  .option('-d, --data <path>', 'data storage path', './data')
  .option('-f, --force', 'force re-index all documents')
  .option('-i, --interactive', 'review extracted entities interactively')
  .action(async (inputPath, options) => {
    if (options.force) {
      await rm(options.data, { recursive: true, force: true });
      console.log('🗑️  Cleared existing index');
    }

    const hooks = options.interactive ? { onEntitiesExtracted: reviewExtraction } : undefined;
    const { rag } = getFlowRAG(options.data, hooks);

    console.log(`📄 Indexing documents from: ${inputPath}`);

    await rag.index(inputPath);

    const stats = await rag.stats();
    console.log(`✅ Indexed ${stats.documents} documents, ${stats.chunks} chunks`);
    console.log(`   ${stats.entities} entities, ${stats.relations} relations`);
  });
