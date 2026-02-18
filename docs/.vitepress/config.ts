import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'FlowRAG',
  description: 'TypeScript RAG library with knowledge graph support',
  base: '/FlowRAG/',
  head: [['link', { rel: 'icon', href: '/FlowRAG/favicon.ico' }]],

  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Providers', link: '/providers/local' },
      { text: 'Deployment', link: '/deployment/local' },
      { text: 'Reference', link: '/reference/interfaces' },
      { text: 'Blog', link: '/blog/' },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Schema Definition', link: '/guide/schema' },
          { text: 'Indexing', link: '/guide/indexing' },
          { text: 'Querying', link: '/guide/querying' },
          { text: 'Reranker', link: '/guide/reranker' },
          { text: 'MCP Server', link: '/guide/mcp' },
        ],
      },
      {
        text: 'Providers',
        items: [
          { text: 'Local (ONNX)', link: '/providers/local' },
          { text: 'Gemini', link: '/providers/gemini' },
          { text: 'AWS Bedrock', link: '/providers/bedrock' },
        ],
      },
      {
        text: 'Deployment',
        items: [
          { text: 'Local Development', link: '/deployment/local' },
          { text: 'AWS Lambda', link: '/deployment/aws-lambda' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Interfaces', link: '/reference/interfaces' },
          { text: 'Configuration', link: '/reference/configuration' },
          { text: 'CLI', link: '/reference/cli' },
        ],
      },
      {
        text: 'Blog',
        items: [
          { text: 'Why We Built FlowRAG', link: '/blog/why-flowrag' },
          { text: 'TypeScript vs Python for RAG', link: '/blog/typescript-rag' },
          { text: 'Knowledge Graphs: The Missing Piece', link: '/blog/knowledge-graphs' },
        ],
      },
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/Zweer/FlowRAG' }],

    footer: {
      message: 'Released under the MIT License.',
      copyright: '© 2025-present FlowRAG Contributors',
    },

    search: { provider: 'local' },
  },
});
