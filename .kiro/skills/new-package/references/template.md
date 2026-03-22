# Create New Package in Monorepo

## 1. Detect project structure

- npm workspaces (`packages/*` in root `package.json`)
- Scoped naming: `@flowrag/<name>`

## 2. Read existing package metadata

From an existing package (e.g., `packages/core/package.json`), extract:
- `author`, `license`, `repository`, `homepage`, `bugs`

## 3. Create directory structure

```bash
mkdir -p packages/<name>/{src,test}
```

## 4. Create package.json

```json
{
  "name": "@flowrag/<name>",
  "version": "0.0.0",
  "description": "<Short description>",
  "keywords": ["flowrag", "rag", "typescript"],
  "homepage": "<from existing package>",
  "bugs": { "url": "<from existing package>" },
  "repository": {
    "type": "git",
    "url": "<from existing package>",
    "directory": "packages/<name>"
  },
  "license": "MIT",
  "author": "<from existing package>",
  "type": "module",
  "exports": {
    ".": "./dist/index.js",
    "./package.json": "./package.json"
  },
  "files": ["dist"],
  "dependencies": {},
  "engines": { "node": ">= 22" }
}
```

Use `^` for internal deps (e.g., `"@flowrag/core": "^1.0.0"`).

## 5. Create src/index.ts

Minimal entry point with a placeholder export.

## 6. Create test file

```typescript
import { describe, it, expect } from 'vitest';
import { hello } from '../src/index.js';

describe('Package', () => {
  it('should work', () => {
    expect(hello()).toBe('Hello from new package');
  });
});
```

## 7. Create README.md and CHANGELOG.md

## 8. Add scope to .vscode/settings.json

Add the package name (without `@flowrag/` prefix) to `conventionalCommits.scopes`.

## 9. Install, build, test

```bash
npm install && npm run build && npm test
```

## 10. Update root README.md packages table

**Note**: tsconfig.json is NOT needed per package — TypeScript uses the root tsconfig.json.
