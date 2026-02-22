import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

import type { DocumentParser } from '@flowrag/core';
import picomatch from 'picomatch';

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

export interface ScanOptions {
  include?: string[];
  exclude?: string[];
}

export class Scanner {
  private parserMap = new Map<string, DocumentParser>();

  constructor(parsers: DocumentParser[] = []) {
    for (const parser of parsers) {
      for (const ext of parser.supportedExtensions) {
        this.parserMap.set(ext.toLowerCase(), parser);
      }
    }
  }

  async scanFiles(paths: string[], options?: ScanOptions): Promise<Document[]> {
    const filePaths = await this.resolvePaths(paths);
    const filtered = this.filterPaths(filePaths, paths, options);
    const documents: Document[] = [];

    for (const filePath of filtered) {
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

  private filterPaths(filePaths: string[], roots: string[], options?: ScanOptions): string[] {
    if (!options?.include && !options?.exclude) return filePaths;

    const normalize = (patterns: string[]) =>
      patterns.map((p) => (p.includes('/') ? p : `**/${p}`));

    const isIncluded = options.include ? picomatch(normalize(options.include)) : null;
    const isExcluded = options.exclude ? picomatch(normalize(options.exclude)) : null;

    return filePaths.filter((filePath) => {
      let rel = filePath;
      for (const root of roots) {
        if (filePath.startsWith(root)) {
          rel = relative(root, filePath);
          break;
        }
      }

      if (isExcluded?.(rel)) return false;
      if (isIncluded && !isIncluded(rel)) return false;
      return true;
    });
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
