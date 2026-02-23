import type { IncomingMessage, ServerResponse } from 'node:http';

export function createBearerAuthMiddleware(
  token: string,
): (req: IncomingMessage, res: ServerResponse, next: () => void) => void {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || header !== `Bearer ${token}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
    next();
  };
}
