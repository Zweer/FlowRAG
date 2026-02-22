import type { Stats } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';

import type { DocumentParser } from '@flowrag/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Scanner } from '../../src/indexing/scanner.js';

vi.mock('node:fs/promises');

const mockStat = vi.mocked(stat);
const mockReadFile = vi.mocked(readFile);
const mockReaddir = vi.mocked(readdir);

function fileStat(): Stats {
  return { isFile: () => true, isDirectory: () => false } as Stats;
}

function dirStat(): Stats {
  return { isFile: () => false, isDirectory: () => true } as Stats;
}

// biome-ignore lint/suspicious/noExplicitAny: mock Dirent without generic hassle
function dirent(name: string, isDir: boolean): any {
  return { name, isFile: () => !isDir, isDirectory: () => isDir };
}

describe('Scanner', () => {
  let scanner: Scanner;

  beforeEach(() => {
    vi.clearAllMocks();
    scanner = new Scanner();
  });

  it('should scan single file successfully', async () => {
    mockStat.mockResolvedValue(fileStat());
    mockReadFile.mockResolvedValue('  test content  ');

    const documents = await scanner.scanFiles(['/test/file.txt']);

    expect(documents).toHaveLength(1);
    expect(documents[0]).toEqual({
      id: expect.stringMatching(/^doc:/),
      content: 'test content',
      metadata: {
        path: '/test/file.txt',
        extension: '.txt',
        scannedAt: expect.any(String),
      },
    });
  });

  it('should scan multiple files', async () => {
    mockStat.mockResolvedValue(fileStat());
    mockReadFile.mockResolvedValueOnce('content 1').mockResolvedValueOnce('content 2');

    const documents = await scanner.scanFiles(['/test/file1.txt', '/test/file2.md']);

    expect(documents).toHaveLength(2);
    expect(documents[0].content).toBe('content 1');
    expect(documents[1].content).toBe('content 2');
    expect(documents[1].metadata?.extension).toBe('.md');
  });

  it('should scan directory recursively', async () => {
    mockStat.mockResolvedValue(dirStat());
    mockReaddir.mockResolvedValueOnce([
      dirent('readme.md', false),
      dirent('sub', true),
      dirent('.hidden', true),
      dirent('image.png', false),
    ]);
    mockReaddir.mockResolvedValueOnce([dirent('nested.txt', false)]);
    mockReadFile.mockResolvedValue('content');

    const documents = await scanner.scanFiles(['/docs']);

    expect(documents).toHaveLength(2);
    expect(mockReaddir).toHaveBeenCalledTimes(2); // /docs and /docs/sub, not .hidden
  });

  it('should filter non-text files', async () => {
    mockStat.mockResolvedValue(dirStat());
    mockReaddir.mockResolvedValue([
      dirent('doc.md', false),
      dirent('image.png', false),
      dirent('data.json', false),
      dirent('binary.exe', false),
    ]);
    mockReadFile.mockResolvedValue('content');

    const documents = await scanner.scanFiles(['/docs']);

    expect(documents).toHaveLength(2); // .md and .json only
  });

  it('should skip non-text files passed directly', async () => {
    mockStat.mockResolvedValue(fileStat());

    const documents = await scanner.scanFiles(['/test/image.png']);

    expect(documents).toHaveLength(0);
  });

  it('should handle file read errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockStat.mockResolvedValue(fileStat());
    mockReadFile
      .mockResolvedValueOnce('success')
      .mockRejectedValueOnce(new Error('File not found'));

    const documents = await scanner.scanFiles(['/test/good.txt', '/test/bad.txt']);

    expect(documents).toHaveLength(1);
    expect(documents[0].content).toBe('success');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should generate consistent document IDs', async () => {
    mockStat.mockResolvedValue(fileStat());
    mockReadFile.mockResolvedValue('content');

    const docs1 = await scanner.scanFiles(['/test/file.txt']);
    const docs2 = await scanner.scanFiles(['/test/file.txt']);

    expect(docs1[0].id).toBe(docs2[0].id);
  });

  it('should handle empty file paths', async () => {
    const documents = await scanner.scanFiles([]);

    expect(documents).toHaveLength(0);
  });

  describe('include/exclude', () => {
    beforeEach(() => {
      mockStat.mockResolvedValue(dirStat());
      mockReaddir.mockResolvedValue([
        dirent('readme.md', false),
        dirent('config.yaml', false),
        dirent('data.json', false),
        dirent('notes.txt', false),
      ]);
      mockReadFile.mockResolvedValue('content');
    });

    it('should include only matching files', async () => {
      const documents = await scanner.scanFiles(['/docs'], { include: ['*.md'] });

      expect(documents).toHaveLength(1);
      expect(documents[0].metadata?.extension).toBe('.md');
    });

    it('should include multiple patterns', async () => {
      const documents = await scanner.scanFiles(['/docs'], {
        include: ['*.md', '*.yaml'],
      });

      expect(documents).toHaveLength(2);
    });

    it('should exclude matching files', async () => {
      const documents = await scanner.scanFiles(['/docs'], {
        exclude: ['*.json'],
      });

      expect(documents).toHaveLength(3);
    });

    it('should apply both include and exclude', async () => {
      const documents = await scanner.scanFiles(['/docs'], {
        include: ['*.md', '*.yaml'],
        exclude: ['config.*'],
      });

      expect(documents).toHaveLength(1);
      expect(documents[0].metadata?.extension).toBe('.md');
    });

    it('should match nested paths with **', async () => {
      mockReaddir.mockReset();
      mockReaddir.mockResolvedValueOnce([dirent('sub', true), dirent('root.md', false)]);
      mockReaddir.mockResolvedValueOnce([dirent('nested.md', false), dirent('data.json', false)]);

      const documents = await scanner.scanFiles(['/docs'], {
        include: ['**/*.md'],
      });

      expect(documents).toHaveLength(2);
    });

    it('should exclude directories with glob', async () => {
      mockReaddir.mockReset();
      mockReaddir.mockResolvedValueOnce([dirent('keep', true), dirent('skip', true)]);
      mockReaddir.mockResolvedValueOnce([dirent('a.md', false)]);
      mockReaddir.mockResolvedValueOnce([dirent('b.md', false)]);

      const documents = await scanner.scanFiles(['/docs'], {
        exclude: ['skip/**'],
      });

      expect(documents).toHaveLength(1);
    });

    it('should return all files when no include/exclude', async () => {
      const documents = await scanner.scanFiles(['/docs']);

      expect(documents).toHaveLength(4);
    });

    it('should filter with multiple input roots', async () => {
      mockStat.mockResolvedValueOnce(dirStat()).mockResolvedValueOnce(dirStat());
      mockReaddir.mockResolvedValueOnce([dirent('a.md', false)]);
      mockReaddir.mockResolvedValueOnce([dirent('b.txt', false)]);
      mockReadFile.mockResolvedValue('content');

      const documents = await scanner.scanFiles(['/docs', '/other'], {
        include: ['*.md'],
      });

      expect(documents).toHaveLength(1);
      expect(documents[0].metadata?.extension).toBe('.md');
    });
  });

  describe('with parsers', () => {
    let mockParser: DocumentParser;

    beforeEach(() => {
      mockParser = {
        supportedExtensions: ['.pdf'],
        parse: vi.fn(() =>
          Promise.resolve({ content: 'parsed PDF content', metadata: { pages: 3 } }),
        ),
      };
      scanner = new Scanner([mockParser]);
    });

    it('should use parser for matching extensions', async () => {
      mockStat.mockResolvedValue(fileStat());

      const documents = await scanner.scanFiles(['/test/doc.pdf']);

      expect(mockParser.parse).toHaveBeenCalledWith('/test/doc.pdf');
      expect(documents).toHaveLength(1);
      expect(documents[0].content).toBe('parsed PDF content');
      expect(documents[0].metadata?.pages).toBe(3);
    });

    it('should include parser files in directory scan', async () => {
      mockStat.mockResolvedValue(dirStat());
      mockReaddir.mockResolvedValue([dirent('readme.md', false), dirent('manual.pdf', false)]);
      mockReadFile.mockResolvedValue('md content');

      const documents = await scanner.scanFiles(['/docs']);

      expect(documents).toHaveLength(2);
      expect(mockParser.parse).toHaveBeenCalledWith('/docs/manual.pdf');
    });

    it('should still use readFile for text files', async () => {
      mockStat.mockResolvedValue(fileStat());
      mockReadFile.mockResolvedValue('text content');

      const documents = await scanner.scanFiles(['/test/file.txt']);

      expect(mockParser.parse).not.toHaveBeenCalled();
      expect(documents[0].content).toBe('text content');
    });
  });
});
