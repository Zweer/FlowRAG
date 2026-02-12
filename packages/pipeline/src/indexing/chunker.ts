import { encoding_for_model } from 'tiktoken';

import type { Chunk, Document } from '../types.js';

export class Chunker {
  private encoder = encoding_for_model('gpt-4');

  constructor(
    private chunkSize: number = 1200,
    private overlap: number = 100,
  ) {}

  chunkDocument(document: Document): Chunk[] {
    const tokens = this.encoder.encode(document.content);
    const chunks: Chunk[] = [];

    let startToken = 0;
    let chunkIndex = 0;

    while (startToken < tokens.length) {
      const endToken = Math.min(startToken + this.chunkSize, tokens.length);
      const chunkTokens = tokens.slice(startToken, endToken);
      const chunkContent = this.encoder.decode(chunkTokens);
      const contentStr =
        chunkContent instanceof Uint8Array ? new TextDecoder().decode(chunkContent) : chunkContent;

      const chunk: Chunk = {
        id: `chunk:${document.id}:${chunkIndex}`,
        content: contentStr.trim(),
        documentId: document.id,
        startToken,
        endToken,
      };

      chunks.push(chunk);

      // Move start position with overlap
      startToken = endToken - this.overlap;
      chunkIndex++;

      // Avoid infinite loop for very small documents
      if (endToken >= tokens.length) break;
    }

    return chunks;
  }

  dispose(): void {
    this.encoder.free();
  }
}
