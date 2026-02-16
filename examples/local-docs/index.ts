import { defineSchema } from '@flowrag/core';
import { createFlowRAG } from '@flowrag/pipeline';
import { createLocalStorage } from '@flowrag/presets';

// 1. Define your domain schema
const schema = defineSchema({
  entityTypes: ['SERVICE', 'DATABASE', 'PROTOCOL', 'TEAM'],
  relationTypes: ['USES', 'PRODUCES', 'CONSUMES', 'OWNS'],
});

// 2. Create FlowRAG with local storage (JSON + LanceDB + SQLite)
const rag = createFlowRAG({
  schema,
  ...createLocalStorage('./data'),
});

// 3. Index documents from a directory
console.log('📄 Indexing documents...');
await rag.index('./content');

// 4. Show statistics
const stats = await rag.stats();
console.log('📊 Stats:', stats);

// 5. Search
const results = await rag.search('how does authentication work');
console.log(`\n🔍 Found ${results.length} results:`);
for (const result of results) {
  console.log(`  [${result.source}] ${result.id} (score: ${result.score.toFixed(3)})`);
  console.log(`    ${result.content.slice(0, 100)}...`);
}

// 6. Trace data flow
const flow = await rag.traceDataFlow('auth-service', 'downstream');
console.log(`\n🔗 Data flow from auth-service: ${flow.map((e) => e.name).join(' → ')}`);
