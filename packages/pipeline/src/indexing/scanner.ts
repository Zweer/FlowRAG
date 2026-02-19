import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';

import type { DocumentParser } from '@flowrag/core';

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
  private parserMap = new Map<string, DocumentParser>();

  constructor(parsers: DocumentParser[] = []) {
    for (const parser of parsers) {
      for (const ext of parser.supportedExtensions) {
        this.parserMap.set(ext.toLowerCase(), parser);
      }
    }
  }

  async scanFiles(paths: string[]): Promise<Document[]> {
    const filePaths = await this.resolvePaths(paths);
    const documents: Document[] = [];

    for (const filePath of filePaths) {
      try {
        const ext = extname(filePath).toLowerCase();
        const parser = this.parserMap.get(ext);

        let content: string;
        let metadata: Record<string, unknown> = {};

        if (parser) {
          const parsed = await parser.parse(filePath);
          content = parsed.content;
          metadata = parsed.metadata;
        } else {
          content = await readFile(filePath, 'utf-8');
        }

        documents.push({
          id: `doc:${Buffer.from(filePath).toString('base64url')}`,
          content: content.trim(),
          metadata: {
            ...metadata,
            path: filePath,
            extension: ext,
            scannedAt: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.warn(`Failed to scan file ${filePath}:`, error);
      }
    }

    return documents;
  }

  private isSupportedFile(path: string): boolean {
    const ext = extname(path).toLowerCase();
    return TEXT_EXTENSIONS.has(ext) || this.parserMap.has(ext);
  }

  private async resolvePaths(paths: string[]): Promise<string[]> {
    const files: string[] = [];

    for (const path of paths) {
      const info = await stat(path);
      if (info.isDirectory()) {
        files.push(...(await this.scanDirectory(path)));
      } else if (info.isFile() && this.isSupportedFile(path)) {
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
      } else if (entry.isFile() && this.isSupportedFile(entry.name)) {
        files.push(fullPath);
      }
    }

    return files;
  }
}
