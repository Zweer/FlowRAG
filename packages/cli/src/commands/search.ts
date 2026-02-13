import { Command } from '@commander-js/extra-typings';

import { getFlowRAG } from '../rag.js';

export const searchCommand = new Command('search')
  .description('Search indexed documents')
  .argument('<query>', 'search query')
  .option('-d, --data <path>', 'data storage path', './data')
  .option('-m, --mode <mode>', 'search mode: naive, local, global, hybrid', 'hybrid')
  .option('-l, --limit <number>', 'max results', '5')
  .option('-t, --type <type>', 'search type: chunks, entities, relations')
  .action(async (query, options) => {
    const { rag, config } = getFlowRAG(options.data);

    if (options.type === 'entities') {
      const entities = await config.storage.graph.getEntities();
      const matches = entities.filter(
        (e) =>
          e.name.toLowerCase().includes(query.toLowerCase()) ||
          e.description.toLowerCase().includes(query.toLowerCase()),
      );

      if (matches.length === 0) {
        console.log('No entities found.');
        return;
      }

      console.log(`🔍 ${matches.length} entity(ies) matching "${query}":\n`);
      for (const entity of matches) {
        console.log(`  [${entity.type}] ${entity.name}`);
        console.log(`    ${entity.description}\n`);
      }
      return;
    }

    if (options.type === 'relations') {
      const entities = await config.storage.graph.getEntities();
      const entity = entities.find((e) => e.name.toLowerCase() === query.toLowerCase());

      if (!entity) {
        console.log(`No entity found with name "${query}".`);
        return;
      }

      const relations = await config.storage.graph.getRelations(entity.id, 'both');

      if (relations.length === 0) {
        console.log(`No relations found for "${query}".`);
        return;
      }

      console.log(`🔍 ${relations.length} relation(s) for "${query}":\n`);
      for (const rel of relations) {
        console.log(`  ${rel.sourceId} --[${rel.type}]--> ${rel.targetId}`);
        console.log(`    ${rel.description}\n`);
      }
      return;
    }

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
