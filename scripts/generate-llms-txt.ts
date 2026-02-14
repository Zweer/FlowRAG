import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SITE_URL = 'https://zweer.github.io/FlowRAG';
const DOCS_DIR = resolve(import.meta.dirname, '../docs');
const OUT_DIR = resolve(DOCS_DIR, 'public');

const sidebar: Array<{
  section: string;
  pages: Array<{ text: string; link: string; desc: string }>;
}> = [
  {
    section: 'Guide',
    pages: [
      {
        text: 'Getting Started',
        link: '/guide/getting-started',
        desc: 'Install and first RAG in 5 minutes',
      },
      {
        text: 'Schema Definition',
        link: '/guide/schema',
        desc: 'Define entity types, relation types, and custom fields',
      },
      {
        text: 'Indexing',
        link: '/guide/indexing',
        desc: 'Batch indexing pipeline with LLM extraction',
      },
      {
        text: 'Querying',
        link: '/guide/querying',
        desc: 'Dual retrieval: vector search + graph traversal',
      },
      {
        text: 'Reranker',
        link: '/guide/reranker',
        desc: 'Optional post-retrieval reranking for better results',
      },
    ],
  },
  {
    section: 'Providers',
    pages: [
      {
        text: 'Local (ONNX)',
        link: '/providers/local',
        desc: 'Offline embeddings and reranking via ONNX',
      },
      {
        text: 'Gemini',
        link: '/providers/gemini',
        desc: 'Google Gemini for embeddings, extraction, and reranking',
      },
      {
        text: 'AWS Bedrock',
        link: '/providers/bedrock',
        desc: 'AWS Bedrock for embeddings, extraction, and reranking',
      },
    ],
  },
  {
    section: 'Deployment',
    pages: [
      {
        text: 'Local Development',
        link: '/deployment/local',
        desc: 'Git-friendly file-based storage',
      },
      {
        text: 'AWS Lambda',
        link: '/deployment/aws-lambda',
        desc: 'Serverless deployment with S3 and OpenSearch',
      },
    ],
  },
  {
    section: 'Reference',
    pages: [
      {
        text: 'Interfaces',
        link: '/reference/interfaces',
        desc: 'Storage, Embedder, Extractor, Reranker interfaces',
      },
      {
        text: 'Configuration',
        link: '/reference/configuration',
        desc: 'All config options with TypeScript types',
      },
      { text: 'CLI', link: '/reference/cli', desc: 'Commands: init, index, search, stats, graph' },
    ],
  },
  {
    section: 'Blog',
    pages: [
      {
        text: 'Why We Built FlowRAG',
        link: '/blog/why-flowrag',
        desc: 'The problem we solved and why',
      },
      {
        text: 'TypeScript vs Python for RAG',
        link: '/blog/typescript-rag',
        desc: 'Why TypeScript makes sense for RAG',
      },
      {
        text: 'Knowledge Graphs: The Missing Piece',
        link: '/blog/knowledge-graphs',
        desc: 'Why vector search alone is not enough',
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
const fullParts: string[] = [
  '# FlowRAG\n\n> TypeScript RAG library with knowledge graph support.\n',
];

for (const page of allPages) {
  const filePath = resolve(DOCS_DIR, `${page.link.slice(1)}.md`);
  const content = readFileSync(filePath, 'utf-8').replace(/^---\n[\s\S]*?\n---\n/, '');
  fullParts.push(`\n---\n\n${content.trim()}\n`);
}

writeFileSync(resolve(OUT_DIR, 'llms-full.txt'), fullParts.join('\n'));
console.log('✅ Generated: docs/public/llms-full.txt');
