export interface RetryOptions {
  retries?: number;
  backoff?: number;
  maxBackoff?: number;
  retryOn?: (error: unknown) => boolean;
}

const DEFAULT_RETRIES = 3;
const DEFAULT_BACKOFF = 1000;
const DEFAULT_MAX_BACKOFF = 30000;

function isTransientError(error: unknown): boolean {
  let current: unknown = error;
  while (current instanceof Error) {
    const msg = current.message.toLowerCase();
    if (msg.includes('timeout') || msg.includes('econnreset') || msg.includes('econnrefused'))
      return true;

    // HTTP status codes in error messages or properties
    const status =
      (current as { status?: number }).status ?? (current as { statusCode?: number }).statusCode;
    if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504)
      return true;

    current = current.cause;
  }
  return false;
}

export async function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
  const retries = options?.retries ?? DEFAULT_RETRIES;
  const backoff = options?.backoff ?? DEFAULT_BACKOFF;
  const maxBackoff = options?.maxBackoff ?? DEFAULT_MAX_BACKOFF;
  const shouldRetry = options?.retryOn ?? isTransientError;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries || !shouldRetry(error)) throw error;

      const delay = Math.min(backoff * 2 ** attempt, maxBackoff);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
