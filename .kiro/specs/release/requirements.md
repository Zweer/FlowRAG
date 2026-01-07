# FlowRAG Release Management Requirements

> Custom release tool requirements after evaluating existing solutions (Changesets, Beachball, Release-It, Bumpp).

## Current Problems with Existing Tools

- **Changesets**: Complex PR workflow, unpredictable version bumps (storage-* → 2.0.0)
- **Beachball**: Too complex, poor GitHub Actions integration
- **Release-It**: No native monorepo support (marked as wontfix)
- **Bumpp**: Too simple, no changelog/GitHub releases
- **npm native**: Missing changelog, GitHub releases, too basic

## Requirements for Custom Release Tool

### Must Have ✅

#### Functional Requirements
- ✅ **Version bumping**: All packages to same version (e.g., all to 1.2.0)
- ✅ **Changelog generation**: Automatic from conventional commits
- ✅ **GitHub Releases**: Auto-creation with changelog content
- ✅ **npm publishing**: Publish all packages with OIDC
- ✅ **Git operations**: Commit, tag, push automatically
- ✅ **Monorepo native**: npm workspaces support
- ✅ **Manual control**: Developer decides when to release

#### Workflow Requirements
- ✅ **Direct flow**: No intermediate PRs (unlike Changesets)
- ✅ **One command**: `npm run release minor` does everything
- ✅ **Version control**: Force specific version or semantic bump
- ✅ **Synchronized packages**: All packages always same version
- ✅ **Build integration**: Automatic `npm run build` before publish

#### Technical Requirements
- ✅ **OIDC authentication**: No NPM_TOKEN needed
- ✅ **GitHub Action friendly**: Single command in workflow
- ✅ **Custom commit messages**: `chore: release v1.2.0` format
- ✅ **Internal dependencies**: Auto-update cross-package references
- ✅ **Conventional commits**: Parse feat, fix, breaking changes

### Must NOT Have ❌

- ❌ **Change files**: No .changeset or similar tracking files
- ❌ **Release PRs**: No intermediate PR workflow
- ❌ **Complex configuration**: Minimal setup required
- ❌ **Heavy dependencies**: Keep tool lightweight
- ❌ **Automatic releases**: Manual trigger only

## Target Workflow

### Developer Experience
```bash
# 1. Normal development
git commit -m "feat: add new storage adapter"
git commit -m "fix: resolve connection timeout"

# 2. When ready to release
npm run release minor    # Bumps all packages 1.1.0 → 1.2.0
# OR
npm run release 2.0.0    # Forces all packages to 2.0.0
# OR  
npm run release patch    # Bumps all packages 1.1.0 → 1.1.1

# 3. Tool automatically:
# - Generates changelog from commits
# - Updates all package.json versions
# - Runs npm run build
# - Creates commit: "chore: release v1.2.0"
# - Creates git tag: "v1.2.0"
# - Pushes to GitHub
# - Publishes to npm (all packages)
# - Creates GitHub Release with changelog
```

### GitHub Action Integration
```yaml
name: Release
on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version bump (patch/minor/major) or specific version'
        required: true
        default: 'patch'

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm run release ${{ github.event.inputs.version }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Tool Specification

### Package Name
`@flowrag/release-tool`

### Installation
```bash
npm install @flowrag/release-tool -D
```

### Basic Usage
```json
// package.json
{
  "scripts": {
    "release": "flowrag-release"
  }
}
```

### Configuration (Optional)
```json
// flowrag-release.config.js
{
  "commitMessage": "chore: release v{version}",
  "tagFormat": "v{version}",
  "changelogSections": {
    "feat": "✨ Features",
    "fix": "🐛 Bug Fixes", 
    "perf": "⚡ Performance",
    "docs": "📚 Documentation",
    "breaking": "💥 Breaking Changes"
  },
  "buildCommand": "npm run build",
  "testCommand": "npm test"
}
```

### CLI Options
```bash
flowrag-release patch           # Semantic patch bump
flowrag-release minor           # Semantic minor bump  
flowrag-release major           # Semantic major bump
flowrag-release 2.0.0           # Force specific version
flowrag-release --dry-run       # Show what would happen
flowrag-release --skip-build    # Skip build step
flowrag-release --skip-test     # Skip test step
```

## Implementation Requirements

### Core Features
- **Monorepo detection**: Auto-discover npm workspaces
- **Version synchronization**: Keep all packages at same version
- **Changelog generation**: Parse conventional commits since last tag
- **GitHub integration**: Create releases via GitHub API
- **npm publishing**: Publish all packages with proper auth
- **Git operations**: Commit, tag, push with proper messages

### Error Handling
- **Validation**: Check git status, npm auth, build success
- **Rollback**: Ability to undo failed releases
- **Clear errors**: Helpful error messages with solutions
- **Dry-run mode**: Preview changes before execution

### Dependencies (Minimal)
- **@octokit/rest**: GitHub API integration
- **conventional-commits-parser**: Parse commit messages
- **semver**: Version manipulation
- **execa**: Command execution
- **chalk**: Colored output

### Code Structure
```
@flowrag/release-tool/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── core/
│   │   ├── version.ts        # Version bumping logic
│   │   ├── changelog.ts      # Changelog generation
│   │   ├── git.ts           # Git operations
│   │   ├── npm.ts           # npm operations
│   │   └── github.ts        # GitHub API
│   ├── utils/
│   │   ├── config.ts        # Configuration loading
│   │   ├── workspace.ts     # Monorepo detection
│   │   └── validation.ts    # Pre-flight checks
│   └── types.ts             # TypeScript types
├── package.json
└── README.md
```

## Success Criteria

1. **Setup time**: < 2 minutes from install to first release
2. **Command simplicity**: Single command releases everything
3. **Error rate**: < 1% failed releases due to tool issues
4. **Performance**: Complete release in < 60 seconds
5. **Maintenance**: Zero configuration drift over time

## Migration Plan

### Phase 1: Tool Development (1-2 days)
- [ ] Core version bumping logic
- [ ] Changelog generation from commits
- [ ] Git operations (commit, tag, push)
- [ ] npm publishing with OIDC
- [ ] GitHub release creation

### Phase 2: Integration (1 day)
- [ ] Remove Changesets configuration
- [ ] Install @flowrag/release-tool
- [ ] Update GitHub Action workflow
- [ ] Test with dry-run mode

### Phase 3: Production (1 day)
- [ ] First real release using new tool
- [ ] Verify all packages published correctly
- [ ] Confirm GitHub release created
- [ ] Document new workflow for team

---

*Decision made: 2026-01-07*
*Status: Ready for implementation*
*Estimated effort: 3-4 days*
