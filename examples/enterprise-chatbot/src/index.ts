import { defineSchema } from '@flowrag/core';
import { createFlowRAG } from '@flowrag/pipeline';
import { createLocalStorage } from '@flowrag/presets';
import { OpenAIExtractor } from '@flowrag/provider-openai';

/**
 * Index company documentation into the knowledge base.
 *
 * Usage: npm run index
 */

const schema = defineSchema({
  entityTypes: ['SERVICE', 'DATABASE', 'TEAM', 'TOOL', 'PROTOCOL', 'POLICY'],
  relationTypes: ['USES', 'OWNS', 'PRODUCES', 'CONSUMES', 'DEPENDS_ON', 'COMMUNICATES_WITH'],
});

const rag = createFlowRAG({
  schema,
  ...createLocalStorage('./data'),
  extractor: new OpenAIExtractor(),
  observability: {
    onLLMCall: ({ model, duration, usage }) => {
      console.log(`  🤖 LLM: ${model} (${duration}ms, ${usage?.totalTokens ?? '?'} tokens)`);
    },
    onEmbedding: ({ textsCount, duration }) => {
      console.log(`  📐 Embed: ${textsCount} texts (${duration}ms)`);
    },
  },
});

console.log('📚 Indexing company documentation...\n');

await rag.index('./content', {
  onProgress: (event) => {
    switch (event.type) {
      case 'scan':
        console.log(`Found ${event.documentsTotal} documents`);
        break;
      case 'document:start':
        console.log(`\n📄 Processing: ${event.documentId}`);
        break;
      case 'document:skip':
        console.log(`⏭️  Skipped (unchanged): ${event.documentId}`);
        break;
      case 'document:done':
        console.log(`✅ Done: ${event.documentId}`);
        break;
      case 'done':
        console.log(`\n🎉 Indexing complete!`);
        break;
    }
  },
});

const stats = await rag.stats();
console.log(
  `\n📊 Stats: ${stats.documents} docs, ${stats.chunks} chunks, ${stats.entities} entities, ${stats.relations} relations`,
);

// Export the knowledge graph
const dot = await rag.export('dot');
console.log(`\n🔗 Knowledge graph (DOT):\n${dot}`);
