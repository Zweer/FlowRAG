import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

import type { Document } from '../types.js';

export class Scanner {
  async scanFiles(paths: string[]): Promise<Document[]> {
    const documents: Document[] = [];

    for (const path of paths) {
      try {
        const content = await this.readFile(path);
        const document: Document = {
          id: this.generateDocumentId(path),
          content,
          metadata: {
            path,
            extension: extname(path),
            scannedAt: new Date().toISOString(),
          },
        };
        documents.push(document);
      } catch (error) {
        console.warn(`Failed to scan file ${path}:`, error);
      }
    }

    return documents;
  }

  private async readFile(path: string): Promise<string> {
    const content = await readFile(path, 'utf-8');
    return content.trim();
  }

  private generateDocumentId(path: string): string {
    // Simple hash-like ID based on path
    return `doc:${Buffer.from(path).toString('base64url')}`;
  }
}
