import { readFile } from 'node:fs/promises';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Scanner } from '../../src/indexing/scanner.js';

vi.mock('node:fs/promises');

describe('Scanner', () => {
  let scanner: Scanner;
  const mockReadFile = vi.mocked(readFile);

  beforeEach(() => {
    vi.clearAllMocks();
    scanner = new Scanner();
  });

  it('should scan single file successfully', async () => {
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
    mockReadFile.mockResolvedValueOnce('content 1').mockResolvedValueOnce('content 2');

    const documents = await scanner.scanFiles(['/test/file1.txt', '/test/file2.md']);

    expect(documents).toHaveLength(2);
    expect(documents[0].content).toBe('content 1');
    expect(documents[1].content).toBe('content 2');
    expect(documents[1].metadata?.extension).toBe('.md');
  });

  it('should handle file read errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockReadFile
      .mockResolvedValueOnce('success')
      .mockRejectedValueOnce(new Error('File not found'));

    const documents = await scanner.scanFiles(['/test/good.txt', '/test/bad.txt']);

    expect(documents).toHaveLength(1);
    expect(documents[0].content).toBe('success');
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to scan file /test/bad.txt:',
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it('should generate consistent document IDs', async () => {
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
