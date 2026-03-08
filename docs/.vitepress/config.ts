import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'FlowRAG',
  description: 'TypeScript RAG library with knowledge graph support',
  base: '/FlowRAG/',
  head: [
    [
      'link',
      { rel: 'icon', type: 'image/png', href: '/FlowRAG/favicon-96x96.png', sizes: '96x96' },
    ],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/FlowRAG/favicon.svg' }],
    ['link', { rel: 'shortcut icon', href: '/FlowRAG/favicon.ico' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/FlowRAG/apple-touch-icon.png' }],
    ['meta', { name: 'apple-mobile-web-app-title', content: 'FlowRAG' }],
    ['link', { rel: 'manifest', href: '/FlowRAG/site.webmanifest' }],
    ['meta', { property: 'og:title', content: 'FlowRAG' }],
    [
      'meta',
      {
        property: 'og:description',
        content:
          'TypeScript RAG library with knowledge graph support. Batch indexing, semantic search, Lambda-friendly.',
      },
    ],
    ['meta', { property: 'og:url', content: 'https://zweer.github.io/FlowRAG/' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:image', content: 'https://zweer.github.io/FlowRAG/og-image.png' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: 'https://zweer.github.io/FlowRAG/og-image.png' }],
    ['meta', { name: 'twitter:title', content: 'FlowRAG' }],
    [
      'meta',
      {
        name: 'twitter:description',
        content: 'TypeScript RAG library with knowledge graph support',
      },
    ],
  ],
  sitemap: { hostname: 'https://zweer.github.io/FlowRAG/' },

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
          { text: 'Multi-Tenancy', link: '/guide/multi-tenancy' },
        ],
      },
      {
        text: 'Providers',
        items: [
          { text: 'Local (ONNX)', link: '/providers/local' },
          { text: 'Gemini', link: '/providers/gemini' },
          { text: 'AWS Bedrock', link: '/providers/bedrock' },
          { text: 'OpenAI', link: '/providers/openai' },
          { text: 'Anthropic', link: '/providers/anthropic' },
        ],
      },
      {
        text: 'Deployment',
        items: [
          { text: 'Local Development', link: '/deployment/local' },
          { text: 'AWS Lambda', link: '/deployment/aws-lambda' },
          { text: 'Redis', link: '/deployment/redis' },
          { text: 'Remote MCP Server', link: '/deployment/remote-mcp' },
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
