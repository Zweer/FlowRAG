---
name: new-package
description: Scaffold a new package in the FlowRAG monorepo. Use when adding a new storage, provider, or utility package.
---

# Create New Package

Scaffolds a new package under `packages/` with all required files.

## Steps

1. Detect workspace pattern and naming convention from root `package.json`
2. Read metadata (author, license, repository) from an existing package
3. Create `packages/<name>/` with `src/`, `test/` directories
4. Create `package.json`, `src/index.ts`, `test/index.test.ts`, `README.md`, `CHANGELOG.md`
5. Add scope to `.vscode/settings.json` `conventionalCommits.scopes`
6. Run `npm install && npm run build && npm test`

## References

- Review `references/template.md` for the detailed scaffolding template
