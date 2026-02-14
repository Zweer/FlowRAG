# Create New Package in Monorepo

## 1. Detect project structure

Check if the project uses:
- npm workspaces (`package.json` has `"workspaces"` field)
- pnpm workspaces (`pnpm-workspace.yaml` exists)
- Yarn workspaces (`package.json` has `"workspaces"` field + `yarn.lock`)

Determine:
- Package manager (npm, pnpm, yarn)
- Workspace pattern (e.g., `packages/*`)
- Naming convention (scoped like `@org/name` or unscoped)

## 2. Read existing package metadata

From root `package.json` or an existing package, extract:
- `author` (name and email)
- `license` (e.g., MIT, Apache-2.0)
- `repository` (type and URL)
- `homepage`
- `bugs` (URL)

## 3. Create directory structure

```bash
mkdir -p <workspace-path>/<name>/{src,test}
```

Example: `packages/<name>/{src,test}` or `apps/<name>/{src,test}`

## 4. Create package.json

```json
{
  "name": "<package-name>",
  "version": "0.0.0",
  "description": "<Short description>",
  "keywords": [],
  "homepage": "<from root or existing package>",
  "bugs": {
    "url": "<from root or existing package>"
  },
  "repository": {
    "type": "git",
    "url": "<from root or existing package>",
    "directory": "<workspace-path>/<name>"
  },
  "license": "<from root or existing package>",
  "author": "<from root or existing package>",
  "type": "module",
  "exports": {
    ".": "./dist/index.js",
    "./package.json": "./package.json"
  },
  "files": [
    "dist"
  ],
  "dependencies": {},
  "engines": {
    "node": ">=<version from root or existing package>"
  }
}
```

**Dependency syntax**:
- **npm**: Use `^` for internal deps (e.g., `"@org/core": "^1.0.0"`)
- **pnpm**: Use `workspace:*` for internal deps
- **Yarn**: Use `workspace:^` for internal deps

**devDependencies**: Only add if package-specific. Most projects have test/build tools at root level.

## 5. Create src/index.ts (or src/index.js)

Minimal entry point:

```typescript
export function hello() {
  return 'Hello from new package';
}
```

## 6. Create test file

Match the project's test framework (Jest, Vitest, Mocha, etc.):

```typescript
import { describe, it, expect } from '<test-framework>';
import { hello } from '../src/index.js';

describe('Package', () => {
  it('should work', () => {
    expect(hello()).toBe('Hello from new package');
  });
});
```

## 7. Create README.md

```markdown
# <package-name>

> Short description

## Installation

\`\`\`bash
npm install <package-name>
\`\`\`

## Usage

\`\`\`javascript
import { hello } from '<package-name>';

hello();
\`\`\`

## License

<license from root>
```

## 8. Create CHANGELOG.md

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
```

## 9. Add scope to .vscode/settings.json (if exists)

If `.vscode/settings.json` has `conventionalCommits.scopes`, add the package name:

```json
{
  "conventionalCommits.scopes": [
    "<new-package-name>",
    // ... other scopes
  ]
}
```

Use the package name without scope prefix (e.g., `core` not `@org/core`).

## 10. Install and build

```bash
<package-manager> install
<package-manager> run build
<package-manager> test
```

## 11. Update root documentation

If root README.md has a packages table, add the new package.

## Summary

1. Detect project structure (npm/pnpm/yarn, workspace pattern)
2. Read metadata from root or existing packages
3. Create directory structure
4. Create package.json with correct metadata and dependency syntax
5. Create src/index file
6. Create test file matching project's framework
7. Create README.md
8. Create CHANGELOG.md
9. Add scope to .vscode/settings.json (if exists)
10. Install, build, test
11. Update root documentation

**Note**: tsconfig.json is NOT needed — TypeScript uses the root tsconfig.json automatically for all packages.
