import type { Stats } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';

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
});
