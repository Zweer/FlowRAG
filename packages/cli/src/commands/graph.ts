import { Command } from '@commander-js/extra-typings';

import { getFlowRAG } from '../rag.js';

export const graphCommand = new Command('graph').description('Knowledge graph operations');

graphCommand
  .command('stats')
  .description('Show knowledge graph statistics')
  .option('-d, --data <path>', 'data storage path', './data')
  .action(async (options) => {
    const { config } = getFlowRAG(options.data);
    const entities = await config.storage.graph.getEntities();

    const typeCounts: Record<string, number> = {};
    for (const entity of entities) {
      typeCounts[entity.type] = (typeCounts[entity.type] || 0) + 1;
    }

    let totalRelations = 0;
    const relationTypeCounts: Record<string, number> = {};
    for (const entity of entities) {
      const relations = await config.storage.graph.getRelations(entity.id, 'out');
      totalRelations += relations.length;
      for (const rel of relations) {
        relationTypeCounts[rel.type] = (relationTypeCounts[rel.type] || 0) + 1;
      }
    }

    console.log('📊 Knowledge Graph Stats:\n');
    console.log(`   Entities: ${entities.length}`);
    for (const [type, count] of Object.entries(typeCounts).sort()) {
      console.log(`     ${type}: ${count}`);
    }
    console.log(`\n   Relations: ${totalRelations}`);
    for (const [type, count] of Object.entries(relationTypeCounts).sort()) {
      console.log(`     ${type}: ${count}`);
    }
  });

graphCommand
  .command('export')
  .description('Export knowledge graph in DOT format')
  .option('-d, --data <path>', 'data storage path', './data')
  .action(async (options) => {
    const { config } = getFlowRAG(options.data);
    const entities = await config.storage.graph.getEntities();

    const lines: string[] = ['digraph FlowRAG {', '  rankdir=LR;'];

    for (const entity of entities) {
      lines.push(`  "${entity.name}" [label="${entity.name}\\n(${entity.type})"];`);
    }

    for (const entity of entities) {
      const relations = await config.storage.graph.getRelations(entity.id, 'out');
      for (const rel of relations) {
        const target = entities.find((e) => e.id === rel.targetId);
        if (target) {
          lines.push(`  "${entity.name}" -> "${target.name}" [label="${rel.type}"];`);
        }
      }
    }

    lines.push('}');
    console.log(lines.join('\n'));
  });
