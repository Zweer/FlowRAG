import { beforeEach, describe, expect, it, vi } from 'vitest';

import { withRetry } from '../src/retry.js';

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should return result on first success', async () => {
    const result = await withRetry(() => Promise.resolve('ok'));
    expect(result).toBe('ok');
  });

  it('should retry on transient error and succeed', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('timeout'), { status: 503 }))
      .mockResolvedValueOnce('ok');

    const promise = withRetry(fn, { retries: 2, backoff: 100 });
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw immediately on non-transient error', async () => {
    const fn = vi.fn().mockRejectedValue(Object.assign(new Error('bad request'), { status: 400 }));

    await expect(withRetry(fn, { retries: 3 })).rejects.toThrow('bad request');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should throw after exhausting retries', async () => {
    vi.useRealTimers();
    const fn = vi.fn().mockRejectedValue(new Error('timeout'));

    await expect(withRetry(fn, { retries: 2, backoff: 1 })).rejects.toThrow('timeout');
    expect(fn).toHaveBeenCalledTimes(3);
    vi.useFakeTimers();
  });

  it('should use exponential backoff', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce('ok');

    const promise = withRetry(fn, { retries: 3, backoff: 100 });

    // First retry after 100ms
    await vi.advanceTimersByTimeAsync(100);
    expect(fn).toHaveBeenCalledTimes(2);

    // Second retry after 200ms
    await vi.advanceTimersByTimeAsync(200);
    const result = await promise;
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should cap backoff at maxBackoff', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce('ok');

    const promise = withRetry(fn, { retries: 2, backoff: 50000, maxBackoff: 5000 });
    await vi.advanceTimersByTimeAsync(5000);
    const result = await promise;
    expect(result).toBe('ok');
  });

  it('should use custom retryOn function', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('custom-retryable'))
      .mockResolvedValueOnce('ok');

    const promise = withRetry(fn, {
      retries: 2,
      backoff: 100,
      retryOn: (err) => err instanceof Error && err.message.includes('custom-retryable'),
    });
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;
    expect(result).toBe('ok');
  });

  describe('isTransientError', () => {
    it.each([
      ['timeout', new Error('HeadersTimeoutError: timeout')],
      ['econnreset', new Error('ECONNRESET')],
      ['econnrefused', new Error('ECONNREFUSED')],
      ['429', Object.assign(new Error('rate limit'), { status: 429 })],
      ['500', Object.assign(new Error('server error'), { status: 500 })],
      ['502', Object.assign(new Error('bad gateway'), { status: 502 })],
      ['503', Object.assign(new Error('unavailable'), { status: 503 })],
      ['504', Object.assign(new Error('gateway timeout'), { status: 504 })],
      ['statusCode 429', Object.assign(new Error('rate limit'), { statusCode: 429 })],
    ])('should retry on %s', async (_, error) => {
      const fn = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('ok');
      const promise = withRetry(fn, { retries: 1, backoff: 10 });
      await vi.advanceTimersByTimeAsync(10);
      await expect(promise).resolves.toBe('ok');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it.each([
      ['400', Object.assign(new Error('bad request'), { status: 400 })],
      ['401', Object.assign(new Error('unauthorized'), { status: 401 })],
      ['403', Object.assign(new Error('forbidden'), { status: 403 })],
      ['unknown', new Error('something else')],
    ])('should not retry on %s', async (_, error) => {
      const fn = vi.fn().mockRejectedValue(error);
      await expect(withRetry(fn, { retries: 3 })).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not retry on non-Error', async () => {
      const fn = vi.fn().mockRejectedValue('string error');
      await expect(withRetry(fn, { retries: 3 })).rejects.toBe('string error');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
