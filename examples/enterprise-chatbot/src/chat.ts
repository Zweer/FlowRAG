import { createInterface } from 'node:readline';

import { defineSchema } from '@flowrag/core';
import { createFlowRAG } from '@flowrag/pipeline';
import { createLocalStorage } from '@flowrag/presets';
import { OpenAIExtractor } from '@flowrag/provider-openai';
import OpenAI from 'openai';

/**
 * Interactive chatbot that answers questions using company documentation.
 *
 * Flow: User question → FlowRAG search → LLM generates answer with citations
 *
 * Usage: npm run chat
 */

// --- FlowRAG setup (retrieval) ---

const schema = defineSchema({
  entityTypes: ['SERVICE', 'DATABASE', 'TEAM', 'TOOL', 'PROTOCOL', 'POLICY'],
  relationTypes: ['USES', 'OWNS', 'PRODUCES', 'CONSUMES', 'DEPENDS_ON', 'COMMUNICATES_WITH'],
});

const rag = createFlowRAG({
  schema,
  ...createLocalStorage('./data'),
  extractor: new OpenAIExtractor(),
});

// --- OpenAI setup (generation) ---

const openai = new OpenAI();

async function chat(question: string): Promise<string> {
  // 1. Retrieve relevant context from FlowRAG
  const results = await rag.search(question, { mode: 'hybrid', limit: 5 });

  if (results.length === 0) {
    return "I couldn't find any relevant information in the documentation.";
  }

  // 2. Build context from search results
  const context = results
    .map((r, i) => {
      const source = r.sources[0];
      const ref = source?.filePath ?? source?.documentId ?? 'unknown';
      return `[${i + 1}] (from ${ref})\n${r.content}`;
    })
    .join('\n\n---\n\n');

  // 3. Generate answer using LLM
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a helpful assistant that answers questions about Acme Corp's internal documentation.

Rules:
- Answer ONLY based on the provided context. If the context doesn't contain the answer, say so.
- Cite your sources using [1], [2], etc. references.
- Be concise and direct.
- If the question is about something not in the docs, say "I don't have information about that in the current documentation."`,
      },
      {
        role: 'user',
        content: `Context:\n${context}\n\nQuestion: ${question}`,
      },
    ],
    temperature: 0.3,
  });

  return response.choices[0].message.content ?? 'No response generated.';
}

// --- Interactive chat loop ---

const rl = createInterface({ input: process.stdin, output: process.stdout });

console.log('🤖 Acme Corp Documentation Chatbot');
console.log('   Ask questions about architecture, APIs, onboarding, security...');
console.log('   Type "quit" to exit.\n');

function prompt() {
  rl.question('You: ', async (input) => {
    const question = input.trim();
    if (!question || question === 'quit') {
      console.log('Bye! 👋');
      rl.close();
      return;
    }

    try {
      const answer = await chat(question);
      console.log(`\nBot: ${answer}\n`);
    } catch (error) {
      console.error(`\nError: ${(error as Error).message}\n`);
    }

    prompt();
  });
}

prompt();
