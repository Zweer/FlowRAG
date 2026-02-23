import type { IncomingMessage, ServerResponse } from 'node:http';

import { describe, expect, it, vi } from 'vitest';

import { createBearerAuthMiddleware } from '../src/auth.js';

function createMockReqRes(authorization?: string) {
  const req = { headers: { authorization } } as IncomingMessage;
  const res = { writeHead: vi.fn(), end: vi.fn() } as unknown as ServerResponse & {
    writeHead: ReturnType<typeof vi.fn>;
    end: ReturnType<typeof vi.fn>;
  };
  const next = vi.fn();
  return { req, res, next };
}

describe('createBearerAuthMiddleware', () => {
  const middleware = createBearerAuthMiddleware('secret-token');

  it('calls next for valid token', () => {
    const { req, res, next } = createMockReqRes('Bearer secret-token');
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.writeHead).not.toHaveBeenCalled();
  });

  it('returns 401 for invalid token', () => {
    const { req, res, next } = createMockReqRes('Bearer wrong-token');
    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.writeHead).toHaveBeenCalledWith(401, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Unauthorized' }));
  });

  it('returns 401 for missing Authorization header', () => {
    const { req, res, next } = createMockReqRes(undefined);
    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.writeHead).toHaveBeenCalledWith(401, expect.any(Object));
  });

  it('returns 401 for non-Bearer scheme', () => {
    const { req, res, next } = createMockReqRes('Basic dXNlcjpwYXNz');
    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.writeHead).toHaveBeenCalledWith(401, expect.any(Object));
  });
});
