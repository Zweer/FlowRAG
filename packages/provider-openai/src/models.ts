/** Well-known OpenAI embedding model IDs */
export const OpenAIEmbeddingModels = {
  TEXT_EMBEDDING_3_SMALL: 'text-embedding-3-small',
  TEXT_EMBEDDING_3_LARGE: 'text-embedding-3-large',
} as const;

/** Well-known OpenAI LLM model IDs for entity extraction and reranking */
export const OpenAILLMModels = {
  GPT_5_MINI: 'gpt-5-mini',
  GPT_5: 'gpt-5',
  GPT_5_2: 'gpt-5.2',
} as const;
