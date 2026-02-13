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

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Schema Definition', link: '/guide/schema' },
          ],
        },
        {
          text: 'Pipeline',
          items: [
            { text: 'Indexing', link: '/guide/indexing' },
            { text: 'Querying', link: '/guide/querying' },
            { text: 'Reranker', link: '/guide/reranker' },
          ],
        },
      ],
      '/providers/': [
        {
          text: 'Providers',
          items: [
            { text: 'Local (ONNX)', link: '/providers/local' },
            { text: 'Gemini', link: '/providers/gemini' },
            { text: 'AWS Bedrock', link: '/providers/bedrock' },
          ],
        },
      ],
      '/deployment/': [
        {
          text: 'Deployment',
          items: [
            { text: 'Local Development', link: '/deployment/local' },
            { text: 'AWS Lambda', link: '/deployment/aws-lambda' },
          ],
        },
      ],
      '/reference/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Interfaces', link: '/reference/interfaces' },
            { text: 'Configuration', link: '/reference/configuration' },
            { text: 'CLI', link: '/reference/cli' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/Zweer/FlowRAG' }],

    footer: {
      message: 'Released under the MIT License.',
      copyright: '© 2025-present FlowRAG Contributors',
    },

    search: { provider: 'local' },
  },
});
