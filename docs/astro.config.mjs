// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://zweer.github.io/FlowRAG',
  base: '/FlowRAG/',
  integrations: [
    starlight({
      title: 'FlowRAG',
      description: 'TypeScript RAG library with knowledge graph support',
      logo: {
        src: './public/logo.svg',
        alt: 'FlowRAG',
      },
      favicon: '/favicon.ico',
      head: [
        {
          tag: 'link',
          attrs: {
            rel: 'icon',
            type: 'image/png',
            sizes: '96x96',
            href: '/FlowRAG/favicon-96x96.png',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'icon',
            type: 'image/svg+xml',
            href: '/FlowRAG/favicon.svg',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'apple-touch-icon',
            sizes: '180x180',
            href: '/FlowRAG/apple-touch-icon.png',
          },
        },
        {
          tag: 'link',
          attrs: { rel: 'manifest', href: '/FlowRAG/site.webmanifest' },
        },
        {
          tag: 'meta',
          attrs: { name: 'apple-mobile-web-app-title', content: 'FlowRAG' },
        },
        { tag: 'meta', attrs: { property: 'og:title', content: 'FlowRAG' } },
        {
          tag: 'meta',
          attrs: {
            property: 'og:description',
            content:
              'TypeScript RAG library with knowledge graph support. Batch indexing, semantic search, Lambda-friendly.',
          },
        },
        {
          tag: 'meta',
          attrs: { property: 'og:url', content: 'https://zweer.github.io/FlowRAG/' },
        },
        { tag: 'meta', attrs: { property: 'og:type', content: 'website' } },
        {
          tag: 'meta',
          attrs: { property: 'og:image', content: 'https://zweer.github.io/FlowRAG/og-image.png' },
        },
        {
          tag: 'meta',
          attrs: { name: 'twitter:card', content: 'summary_large_image' },
        },
        {
          tag: 'meta',
          attrs: { name: 'twitter:image', content: 'https://zweer.github.io/FlowRAG/og-image.png' },
        },
        { tag: 'meta', attrs: { name: 'twitter:title', content: 'FlowRAG' } },
        {
          tag: 'meta',
          attrs: {
            name: 'twitter:description',
            content: 'TypeScript RAG library with knowledge graph support',
          },
        },
      ],
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/Zweer/FlowRAG' }],
      editLink: {
        baseUrl: 'https://github.com/Zweer/FlowRAG/edit/main/docs/',
      },
      sidebar: [
        {
          label: 'Guide',
          items: [
            { label: 'Getting Started', slug: 'guide/getting-started' },
            { label: 'Schema Definition', slug: 'guide/schema' },
            { label: 'Indexing', slug: 'guide/indexing' },
            { label: 'Querying', slug: 'guide/querying' },
            { label: 'Reranker', slug: 'guide/reranker' },
            { label: 'MCP Server', slug: 'guide/mcp' },
            { label: 'Multi-Tenancy', slug: 'guide/multi-tenancy' },
          ],
        },
        {
          label: 'Providers',
          items: [
            { label: 'Local (ONNX)', slug: 'providers/local' },
            { label: 'Gemini', slug: 'providers/gemini' },
            { label: 'AWS Bedrock', slug: 'providers/bedrock' },
            { label: 'OpenAI', slug: 'providers/openai' },
            { label: 'Anthropic', slug: 'providers/anthropic' },
          ],
        },
        {
          label: 'Deployment',
          items: [
            { label: 'Local Development', slug: 'deployment/local' },
            { label: 'AWS Lambda', slug: 'deployment/aws-lambda' },
            { label: 'Redis', slug: 'deployment/redis' },
            { label: 'Remote MCP Server', slug: 'deployment/remote-mcp' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Interfaces', slug: 'reference/interfaces' },
            { label: 'Configuration', slug: 'reference/configuration' },
            { label: 'CLI', slug: 'reference/cli' },
          ],
        },
        {
          label: 'Blog',
          items: [
            { label: 'Why We Built FlowRAG', slug: 'blog/why-flowrag' },
            { label: 'TypeScript vs Python for RAG', slug: 'blog/typescript-rag' },
            { label: 'Knowledge Graphs: The Missing Piece', slug: 'blog/knowledge-graphs' },
          ],
        },
      ],
    }),
  ],
});
