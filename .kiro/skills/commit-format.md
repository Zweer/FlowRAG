# Commit Message Format

**IMPORTANT**: The agent NEVER commits, pushes, or creates tags. The developer handles all git operations manually.

## Format

Use conventional commits with gitmoji as text (not emoji):

```
type(scope): :emoji_code: short description

Detailed explanation of what changed and why.
Include multiple lines if needed to fully describe:
- What was changed
- Why it was changed
- Any breaking changes or important notes
- Related issues or context
```

## Types

- `feat` — New feature (`:sparkles:`)
- `fix` — Bug fix (`:bug:`)
- `perf` — Performance improvement (`:zap:`)
- `docs` — Documentation (`:memo:`)
- `chore` — Maintenance tasks (`:wrench:`, `:arrow_up:`, `:bookmark:`)
- `refactor` — Code refactoring (`:recycle:`)
- `test` — Tests (`:white_check_mark:`)
- `style` — Code formatting (`:art:`)

## Scope

**Use only ONE scope per commit** — typically the package, module, or component affected.

If `.vscode/settings.json` exists with `conventionalCommits.scopes`, use those values.
Otherwise, use logical component names (e.g., `api`, `ui`, `auth`, `db`).

Scope is optional for cross-cutting changes (docs, chore at root level).

## Gitmoji

**Always use text codes** (`:sparkles:`), **never actual emoji** (✨).

Common gitmoji:
- `:sparkles:` — New feature
- `:bug:` — Bug fix
- `:zap:` — Performance
- `:memo:` — Documentation
- `:recycle:` — Refactoring
- `:white_check_mark:` — Tests
- `:wrench:` — Configuration
- `:arrow_up:` — Dependency upgrade
- `:bookmark:` — Release/version
- `:art:` — Code style/formatting
- `:boom:` — Breaking change
- `:speech_balloon:` — Text/copy changes
- `:alien:` — External API changes

## Body

**Always include a detailed body** with multiple lines explaining:
1. What was changed
2. Why it was changed
3. Any important context or side effects
4. Related issues or PRs

Example:
```
feat(cli): :sparkles: add rollback command

Adds `bonvoy rollback` command to manually roll back failed releases.
Reads `.bonvoy/release-log.json` and reverses all completed actions.

Supports --dry-run flag to preview what would be rolled back.
Includes validation to prevent rolling back already-rolled-back releases.
```

## Breaking Changes

For breaking changes, add `!` after the type/scope and include `BREAKING CHANGE:` in the body:

```
feat(api)!: :boom: remove deprecated methods

BREAKING CHANGE: Removed old API methods that were deprecated in v0.5.
Use the new API instead:
- Old: `bonvoy.release()`
- New: `bonvoy.shipit()`
```

## Examples

```
feat(api): :sparkles: add user authentication endpoint

Implemented JWT-based authentication for the API.
Added login and refresh token endpoints.
Includes rate limiting and brute force protection.
```

```
fix(ui): :bug: resolve button alignment on mobile

Fixed flexbox layout issue causing misaligned buttons on small screens.
Tested on iOS Safari and Android Chrome.
```

```
docs: :memo: add deployment guide

Complete guide for deploying to production.
Covers environment variables, database migrations, and monitoring setup.
```

```
chore: :arrow_up: upgrade dependencies

Updated all dependencies to latest stable versions.
Resolved security vulnerabilities in transitive dependencies.
All tests passing after upgrade.
```

## Summary

1. **Format**: `type(scope): :emoji_code: description` + detailed body
2. **Scope**: Single package name from `.vscode/settings.json`
3. **Gitmoji**: Text code (`:sparkles:`), not emoji (✨)
4. **Body**: Multiple lines explaining what, why, and context
5. **Agent**: NEVER commits — developer does it manually
