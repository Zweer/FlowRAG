# FlowRAG Repo Health & Promotion

> Specification for improving repository health, discoverability, and launching the project publicly.

## 1. Overview

### 1.1 Goal

Prepare FlowRAG for public visibility: maximize GitHub Community Standards score, improve npm/SEO discoverability, and execute a promotion strategy to gain initial traction.

### 1.2 Current State

**GitHub Community Standards** (checked 2026-03-08):
- ✅ Description, README, License, Topics (19), Website URL
- ❌ Code of Conduct, Contributing, Security policy, Issue templates, PR template
- ❌ Discussions not enabled

**npm**: All packages published, but some have generic keywords (e.g., `@flowrag/core` has `["interfaces", "schema", "types"]` instead of RAG-related terms).

**Docs site**: VitePress deployed at zweer.github.io/FlowRAG/, but missing `robots.txt`, sitemap, OG meta tags, favicon, and logo.

## 2. Repo Health (Quick Wins)

### 2.1 Community Health Files

| File | Purpose |
|------|---------|
| `CODE_OF_CONDUCT.md` | Contributor Covenant v2.1 |
| `CONTRIBUTING.md` | How to contribute, setup, coding standards |
| `SECURITY.md` | How to report vulnerabilities |
| `.github/ISSUE_TEMPLATE/bug_report.yml` | Bug report template (YAML form) |
| `.github/ISSUE_TEMPLATE/feature_request.yml` | Feature request template (YAML form) |
| `.github/ISSUE_TEMPLATE/config.yml` | Issue template chooser config |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR checklist |

### 2.2 npm Keywords

Normalize keywords across all packages. Every package should include `flowrag` + `rag` + `typescript` as base keywords, plus package-specific ones.

| Package | Keywords |
|---------|----------|
| `core` | `flowrag`, `rag`, `typescript`, `knowledge-graph`, `interfaces`, `schema` |
| `pipeline` | `flowrag`, `rag`, `typescript`, `pipeline`, `indexing`, `vector-search`, `knowledge-graph`, `dual-retrieval` |
| `storage-*` | `flowrag`, `rag`, `typescript`, `storage`, + specific (`json`, `sqlite`, `lancedb`, `s3`, `opensearch`, `redis`) |
| `provider-*` | `flowrag`, `rag`, `typescript`, `provider`, + specific (`gemini`, `openai`, `bedrock`, `anthropic`, `onnx`, `local`) |
| `presets` | `flowrag`, `rag`, `typescript`, `presets`, `knowledge-graph` |
| `cli` | `flowrag`, `rag`, `typescript`, `cli`, `knowledge-graph`, `vector-search` |
| `mcp` | `flowrag`, `rag`, `typescript`, `mcp`, `model-context-protocol`, `ai-assistant`, `knowledge-graph` |

### 2.3 Docs SEO

| Item | Action |
|------|--------|
| `robots.txt` | Add to `docs/public/` |
| Sitemap | Enable via `vitepress-plugin-sitemap` or VitePress built-in `sitemap` config |
| OG meta tags | Add `head` entries in VitePress config for `og:title`, `og:description`, `og:image`, `og:url` |
| Favicon | Add `favicon.ico` to `docs/public/` (already referenced in config) |

### 2.4 GitHub Settings (Manual)

- Enable Discussions (Settings → Features → Discussions)
- Enable Sponsors (optional, for visibility)

## 3. Logo & Branding

### 3.1 Logo Requirements

- Simple, recognizable at small sizes (npm, GitHub, favicon)
- Represents: flow (water/stream) + RAG (connections/graph)
- Color palette: blue/teal tones (water theme, matches 🌊 emoji)
- Formats needed: SVG (docs), PNG (social), ICO (favicon)

### 3.2 Usage

| Context | Format | Size |
|---------|--------|------|
| Docs site header | SVG | ~32px height |
| Favicon | ICO/PNG | 16x16, 32x32 |
| OG image | PNG | 1200x630 |
| npm README | PNG | ~200px |
| Social profiles | PNG | 400x400 |

### 3.3 Approach

Use an AI image generator (Midjourney, DALL-E, Ideogram) or a designer. The logo should work before the blog post launch — it's the first visual impression.

## 4. Promotion Strategy

### 4.1 Phase 1 — Foundation (before launch)

- [x] GitHub Community Standards at 100%
- [x] npm keywords optimized
- [x] Docs SEO (sitemap, OG tags, robots.txt)
- [ ] Logo created and deployed (docs, favicon, OG image)
- [ ] Enable GitHub Discussions

### 4.2 Phase 2 — Content Launch

Priority order:

1. **dev.to article**: "Why We Built a TypeScript RAG Library (and Why You Might Want One Too)"
   - Adapt from existing blog posts (`why-flowrag.md` + `typescript-rag.md`)
   - Include code examples, architecture diagram, comparison table
   - Tags: `typescript`, `ai`, `rag`, `opensource`

2. **Reddit posts**:
   - r/typescript — "Built a RAG library in TypeScript with knowledge graph support"
   - r/node — "FlowRAG: Lambda-friendly RAG without Python"
   - r/LocalLLaMA — "TypeScript RAG library with local ONNX embeddings"

3. **Twitter/X thread**:
   - Problem → Solution → Code example → Link
   - Tag TypeScript and AI communities

4. **Hacker News**: "Show HN: FlowRAG – TypeScript RAG with Knowledge Graphs"

### 4.3 Phase 3 — Community Growth

- **Awesome lists**: PR to awesome-rag, awesome-typescript, awesome-mcp
- **YouTube**: 5-10 min tutorial video
- **Comparisons**: Benchmark vs LightRAG (indexing speed, query latency)
- **Integration examples**: FlowRAG + Vercel AI SDK, FlowRAG + Next.js

### 4.4 Blog Post Structure (dev.to)

```
Title: Why We Built a TypeScript RAG Library (and Why You Might Want One Too)

1. The Problem (2 paragraphs)
   - RAG ecosystem is Python-only
   - Existing solutions need servers, containers, external DBs

2. What We Wanted (bullet list)
   - Library, not server
   - TypeScript native
   - Lambda-friendly
   - Git-friendly storage
   - Knowledge graphs

3. The Architecture (diagram + explanation)
   - KV + Vector + Graph storage
   - Dual retrieval (vector + graph)
   - Pluggable providers

4. Quick Start (code example)
   - 10 lines to index and search

5. Knowledge Graphs: The Killer Feature (code example)
   - traceDataFlow, findPath
   - Why vector search alone isn't enough

6. What's Next
   - Link to docs, GitHub, npm
   - Call to action: star, try it, contribute
```

## 5. Development Phases

### Phase 1: Repo Health ✅
- [ ] Community health files (CODE_OF_CONDUCT, CONTRIBUTING, SECURITY)
- [ ] Issue templates (bug report, feature request)
- [ ] PR template
- [ ] npm keywords normalization
- [ ] Docs SEO (robots.txt, sitemap, OG tags)

### Phase 2: Branding
- [ ] Logo design
- [ ] Favicon
- [ ] OG image for social sharing
- [ ] Deploy to docs site

### Phase 3: Content Launch
- [ ] dev.to blog post
- [ ] Reddit posts (r/typescript, r/node, r/LocalLLaMA)
- [ ] Twitter/X thread
- [ ] Hacker News "Show HN"

### Phase 4: Community
- [ ] Enable GitHub Discussions
- [ ] Awesome list PRs
- [ ] YouTube tutorial
- [ ] Integration examples

## 6. Success Criteria

1. GitHub Community Standards: 100% score
2. npm: all packages have consistent, discoverable keywords
3. Docs: sitemap indexed by Google, OG tags working on social
4. Blog post: published on dev.to with >100 reactions in first week
5. GitHub: >50 stars in first month after launch

---

*Created: 2026-03-08*
*Status: In Progress*
