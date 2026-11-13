import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SITE_URL = 'https://zweer.github.io/FlowRAG';
const DOCS_DIR = resolve(import.meta.dirname, '../docs');
const CONTENT_DIR = resolve(DOCS_DIR, 'src/content/docs');
const OUT_DIR = resolve(DOCS_DIR, 'public');

// Sidebar structure — mirrors docs/astro.config.mjs.
// Each page carries a short description used for llms.txt (human-readable summary).
const sidebar = [
  {
    section: 'Guide',
    pages: [
      {
        text: 'Getting Started',
        link: '/guide/getting-started',
        desc: 'Install FlowRAG and run your first index + search',
      },
      {
        text: 'Schema Definition',
        link: '/guide/schema',
        desc: 'Define entity types, relation types, and fields',
      },
      {
        text: 'Indexing',
        link: '/guide/indexing',
        desc: 'Chunking, caching, and incremental indexing',
      },
      {
        text: 'Querying',
        link: '/guide/querying',
        desc: 'Query modes, dual retrieval, and data-flow tracing',
      },
      { text: 'Reranker', link: '/guide/reranker', desc: 'Rerank search results for relevance' },
      {
        text: 'MCP Server',
        link: '/guide/mcp',
        desc: 'Expose FlowRAG over the Model Context Protocol',
      },
      {
        text: 'Multi-Tenancy',
        link: '/guide/multi-tenancy',
        desc: 'Isolate data across multiple tenants',
      },
    ],
  },
  {
    section: 'Providers',
    pages: [
      {
        text: 'Local (ONNX)',
        link: '/providers/local',
        desc: 'On-device embeddings and extraction via ONNX runtime',
      },
      { text: 'Gemini', link: '/providers/gemini', desc: 'Google Gemini embedder and extractor' },
      {
        text: 'AWS Bedrock',
        link: '/providers/bedrock',
        desc: 'Amazon Bedrock embedder, extractor, and reranker',
      },
      { text: 'OpenAI', link: '/providers/openai', desc: 'OpenAI embedder and extractor' },
      {
        text: 'Anthropic',
        link: '/providers/anthropic',
        desc: 'Anthropic Claude extractor and reranker',
      },
    ],
  },
  {
    section: 'Deployment',
    pages: [
      {
        text: 'Local Development',
        link: '/deployment/local',
        desc: 'Local, Git-friendly setup with storage presets',
      },
      {
        text: 'AWS Lambda',
        link: '/deployment/aws-lambda',
        desc: 'Deploy FlowRAG queries as serverless functions',
      },
      { text: 'Redis', link: '/deployment/redis', desc: 'Use Redis-backed storage' },
      {
        text: 'Remote MCP Server',
        link: '/deployment/remote-mcp',
        desc: 'Host a remote MCP server for FlowRAG',
      },
    ],
  },
  {
    section: 'Reference',
    pages: [
      {
        text: 'Interfaces',
        link: '/reference/interfaces',
        desc: 'Core TypeScript interfaces and contracts',
      },
      {
        text: 'Configuration',
        link: '/reference/configuration',
        desc: 'All configuration options with examples',
      },
      { text: 'CLI', link: '/reference/cli', desc: 'FlowRAG command-line reference' },
    ],
  },
  {
    section: 'Blog',
    pages: [
      {
        text: 'Why We Built FlowRAG',
        link: '/blog/why-flowrag',
        desc: 'The motivation behind a TypeScript-first RAG library',
      },
      {
        text: 'TypeScript vs Python for RAG',
        link: '/blog/typescript-rag',
        desc: 'Why TypeScript is a strong choice for RAG',
      },
      {
        text: 'Knowledge Graphs: The Missing Piece',
        link: '/blog/knowledge-graphs',
        desc: 'How knowledge graphs improve RAG results',
      },
    ],
  },
];

// --- llms.txt ---
const llmsTxt = [
  '# FlowRAG',
  '',
  '> TypeScript RAG library with knowledge graph support.',
  '',
  ...sidebar.flatMap(({ section, pages }) => [
    `## ${section}`,
    '',
    ...pages.map((p) => `- [${p.text}](${SITE_URL}${p.link}): ${p.desc}`),
    '',
  ]),
].join('\n');

writeFileSync(resolve(OUT_DIR, 'llms.txt'), llmsTxt);
console.log('✅ Generated: docs/public/llms.txt');

// --- llms-full.txt ---
const allPages = sidebar.flatMap(({ pages }) => pages);
const fullParts = ['# FlowRAG\n\n> TypeScript RAG library with knowledge graph support.\n'];

for (const page of allPages) {
  const filePath = resolve(CONTENT_DIR, `${page.link.slice(1)}.md`);
  const content = readFileSync(filePath, 'utf-8')
    // Strip Starlight frontmatter
    .replace(/^---\n[\s\S]*?\n---\n/, '');
  fullParts.push(`\n---\n\n${content.trim()}\n`);
}

writeFileSync(resolve(OUT_DIR, 'llms-full.txt'), fullParts.join('\n'));
console.log('✅ Generated: docs/public/llms-full.txt');
