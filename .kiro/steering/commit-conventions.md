# Commit Conventions

**IMPORTANT**: The agent NEVER commits, pushes, or creates tags. The developer handles all git operations manually.

## Format

Use conventional commits with gitmoji as text (not emoji):

```
type(scope): :emoji_code: short description

Detailed explanation of what changed and why.
```

## Header Limit

The header (first line) must be **≤ 100 characters** (enforced by commitlint).

With long scopes + gitmoji, budget carefully:
- `feat(provider-bedrock): :sparkles: ` = ~39 chars → ~61 left for description
- `fix(core): :bug: ` = ~18 chars → ~82 left for description

## Types

- `feat` — New feature (`:sparkles:`)
- `fix` — Bug fix (`:bug:`)
- `perf` — Performance improvement (`:zap:`)
- `docs` — Documentation (`:memo:`)
- `chore` — Maintenance tasks (`:wrench:`, `:arrow_up:`, `:bookmark:`)
- `refactor` — Code refactoring (`:recycle:`)
- `test` — Tests (`:white_check_mark:`)
- `style` — Code formatting (`:art:`)
- `ci` — CI/CD changes (`:construction_worker:`)
- `build` — Build system (`:hammer:`)

## Scope

Use the package name from `.vscode/settings.json` `conventionalCommits.scopes`:
`cli`, `core`, `mcp`, `pipeline`, `presets`, `provider-bedrock`, `provider-gemini`,
`provider-local`, `storage-json`, `storage-lancedb`, `storage-opensearch`, `storage-s3`,
`storage-sqlite`

Use only ONE scope per commit. Scope is optional for cross-cutting changes.

## Gitmoji

**Always use text codes** (`:sparkles:`), **never actual emoji** (✨).

## Body

**Always include a body** explaining:
1. What was changed
2. Why it was changed
3. Any important context or side effects

## Breaking Changes

Add `!` after the type/scope and include `BREAKING CHANGE:` in the body:

```
feat(core)!: :boom: remove deprecated schema methods

BREAKING CHANGE: Removed old schema API deprecated in v1.0.
```
