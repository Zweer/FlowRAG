/** Well-known Bedrock embedding model IDs */
export const BedrockEmbeddingModels = {
  TITAN_EMBED_V2: 'amazon.titan-embed-text-v2:0',
  COHERE_EMBED_ENGLISH_V3: 'cohere.embed-english-v3',
  COHERE_EMBED_MULTILINGUAL_V3: 'cohere.embed-multilingual-v3',
} as const;

/** Well-known Bedrock LLM model IDs for entity extraction */
export const BedrockLLMModels = {
  CLAUDE_SONNET_4_5: 'anthropic.claude-sonnet-4-5-20250929-v1:0',
  CLAUDE_HAIKU_4_5: 'anthropic.claude-haiku-4-5-20251001-v1:0',
  CLAUDE_OPUS_4_6: 'anthropic.claude-opus-4-6-v1',
  NOVA_LITE: 'amazon.nova-lite-v1:0',
  NOVA_PRO: 'amazon.nova-pro-v1:0',
} as const;
