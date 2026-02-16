import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';

import type { Document } from '../types.js';

const TEXT_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.json',
  '.yaml',
  '.yml',
  '.xml',
  '.html',
  '.htm',
  '.csv',
  '.tsv',
  '.log',
  '.rst',
  '.adoc',
]);

export class Scanner {
  async scanFiles(paths: string[]): Promise<Document[]> {
    const filePaths = await this.resolvePaths(paths);
    const documents: Document[] = [];

    for (const filePath of filePaths) {
      try {
        const content = await readFile(filePath, 'utf-8');
        documents.push({
          id: `doc:${Buffer.from(filePath).toString('base64url')}`,
          content: content.trim(),
          metadata: {
            path: filePath,
            extension: extname(filePath),
            scannedAt: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.warn(`Failed to scan file ${filePath}:`, error);
      }
    }

    return documents;
  }

  private async resolvePaths(paths: string[]): Promise<string[]> {
    const files: string[] = [];

    for (const path of paths) {
      const info = await stat(path);
      if (info.isDirectory()) {
        files.push(...(await this.scanDirectory(path)));
      } else if (info.isFile() && this.isTextFile(path)) {
        files.push(path);
      }
    }

    return files;
  }

  private async scanDirectory(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...(await this.scanDirectory(fullPath)));
      } else if (entry.isFile() && this.isTextFile(entry.name)) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private isTextFile(path: string): boolean {
    return TEXT_EXTENSIONS.has(extname(path).toLowerCase());
  }
}
