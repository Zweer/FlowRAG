/**
 * Well-known Bedrock embedding model IDs.
 *
 * Enterprise recommendations:
 * - Best value: TITAN_EMBED_V2 — cheap, 1024 dims, wide regional availability
 * - Best quality: COHERE_EMBED_V4 — latest gen, text+image, superior benchmarks
 * - Multilingual: COHERE_EMBED_MULTILINGUAL_V3 — 100+ languages, 1024 dims
 */
export const BedrockEmbeddingModels = {
  // Amazon
  TITAN_EMBED_V2: 'amazon.titan-embed-text-v2:0',
  TITAN_EMBED_V1: 'amazon.titan-embed-text-v1',
  NOVA_MULTIMODAL_EMBED: 'amazon.nova-2-multimodal-embeddings-v1:0',
  // Cohere
  COHERE_EMBED_ENGLISH_V3: 'cohere.embed-english-v3',
  COHERE_EMBED_MULTILINGUAL_V3: 'cohere.embed-multilingual-v3',
  COHERE_EMBED_V4: 'cohere.embed-v4:0',
} as const;

/**
 * Well-known Bedrock reranker model IDs.
 *
 * Enterprise recommendations:
 * - Best value: RERANK_V1 — dedicated reranker, good quality, $1/1000 queries
 * - Best quality: COHERE_RERANK_V3_5 — SOTA on BEIR, multilingual, reasoning
 */
export const BedrockRerankerModels = {
  RERANK_V1: 'amazon.rerank-v1:0',
  COHERE_RERANK_V3_5: 'cohere.rerank-v3-5:0',
} as const;

/**
 * Well-known Bedrock LLM model IDs for entity extraction.
 *
 * Enterprise recommendations:
 * - Best value: CLAUDE_HAIKU_4_5 — fast, cheap ($1/$5 per 1M tokens), reliable for structured extraction
 * - Best quality: CLAUDE_SONNET_4_6 — latest Sonnet, excellent structured output, wide cross-region
 * - Top tier: CLAUDE_OPUS_4_6 — absolute best quality, expensive, use for critical extraction
 * - Budget: NOVA_LITE — 20x cheaper than Haiku, sufficient for simple extraction
 */
export const BedrockLLMModels = {
  // Anthropic Claude
  CLAUDE_HAIKU_4_5: 'anthropic.claude-haiku-4-5-20251001-v1:0',
  CLAUDE_SONNET_4: 'anthropic.claude-sonnet-4-20250514-v1:0',
  CLAUDE_SONNET_4_5: 'anthropic.claude-sonnet-4-5-20250929-v1:0',
  CLAUDE_SONNET_4_6: 'anthropic.claude-sonnet-4-6',
  CLAUDE_OPUS_4_1: 'anthropic.claude-opus-4-1-20250805-v1:0',
  CLAUDE_OPUS_4_5: 'anthropic.claude-opus-4-5-20251101-v1:0',
  CLAUDE_OPUS_4_6: 'anthropic.claude-opus-4-6-v1',
  // Amazon Nova
  NOVA_MICRO: 'amazon.nova-micro-v1:0',
  NOVA_LITE: 'amazon.nova-lite-v1:0',
  NOVA_PRO: 'amazon.nova-pro-v1:0',
  NOVA_PREMIER: 'amazon.nova-premier-v1:0',
  NOVA_2_LITE: 'amazon.nova-2-lite-v1:0',
} as const;
