# FlowRAG Release Management Requirements

> Migration from release-please to Changesets for better monorepo release management.

## Current Problems with Release-Please

- **Unreliable**: Frequent configuration issues and failures
- **Complex setup**: Difficult to configure for monorepo with 8 packages
- **Poor debugging**: Hard to understand why releases fail
- **Inflexible**: Limited control over release timing and content

## Requirements for New Release System

### Must Have
- ✅ **Monorepo support**: Handle 8 independent npm packages
- ✅ **Semantic versioning**: Automatic version bumping (patch/minor/major)
- ✅ **Changelog generation**: Beautiful, automatic changelogs
- ✅ **GitHub integration**: Automated via GitHub Actions
- ✅ **NPM publishing**: Direct publish to npm registry
- ✅ **Simple setup**: Maximum 15 minutes configuration
- ✅ **Reliable**: No random failures or configuration drift

### Nice to Have
- 🎯 **Selective releases**: Choose which packages to release
- 📝 **Manual control**: Decide when to release (not fully automatic)
- 🔄 **Dependency bumping**: Auto-update internal dependencies
- 📋 **Release notes**: Rich markdown release notes
- 🚀 **Preview**: See what will be released before publishing

## Evaluated Solutions

### 🏆 **CHOSEN: Changesets**
- **Status**: ✅ Actively maintained (2026)
- **Pros**: 
  - Designed specifically for monorepos
  - Simple workflow: `npx @changesets/cli add`
  - Stable GitHub Action
  - Used by: Remix, Radix UI, tRPC, Stitches
  - Manual control over releases
  - Beautiful changelogs
- **Cons**: 
  - Requires manual changeset creation (actually a pro for control)
- **Setup time**: ~15 minutes
- **Learning curve**: Minimal

### ❌ **Rejected: Semantic Release**
- **Reason**: Too complex for monorepo, requires plugins
- **Issues**: Less control, rigid conventional commits requirement

### ❌ **Rejected: Nx**
- **Reason**: Overkill, we already have build/test setup
- **Issues**: High learning curve, requires migration

### ❌ **Rejected: Lerna**
- **Reason**: Slower, less flexible than Changesets
- **Issues**: Declining popularity

### ❌ **Rejected: Rush**
- **Reason**: Enterprise overkill for 8 packages
- **Issues**: Very high complexity

## Implementation Plan

### Phase 1: Setup Changesets (15 minutes)
1. **Install**: `npm install @changesets/cli -D`
2. **Initialize**: `npx @changesets/cli init`
3. **Configure GitHub Action**: Create `.github/workflows/release.yml`
4. **Remove release-please**: Delete old config and workflow

### Phase 2: First Release
1. **Create changeset**: `npx @changesets/cli add`
2. **Test workflow**: Verify GitHub Action works
3. **Publish**: Merge release PR

### Phase 3: Documentation
1. **Update README**: Document new release process
2. **Team training**: Share new workflow with contributors

## Changesets Workflow

### Developer Workflow
```bash
# 1. Make changes to packages
# 2. Before commit, add changeset:
npx @changesets/cli add
# 3. Select packages and bump type (patch/minor/major)
# 4. Write change description
# 5. Commit everything (including .changeset files)
```

### Release Workflow
1. **GitHub Action** detects changesets in main branch
2. **Creates Release PR** with version bumps and changelogs
3. **Review and merge** Release PR
4. **Automatic publishing** to npm
5. **GitHub releases** created with changelogs

## Configuration

### `.changeset/config.json`
```json
{
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

### GitHub Action
```yaml
name: Release
on:
  push:
    branches: [main]
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - name: Create Release Pull Request or Publish
        uses: changesets/action@v1
        with:
          publish: npm run release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Benefits Over Release-Please

- ✅ **Reliability**: Stable, well-tested GitHub Action
- ✅ **Simplicity**: Clear, intuitive workflow
- ✅ **Control**: Manual decision on what/when to release
- ✅ **Flexibility**: Easy to customize changelogs and versioning
- ✅ **Community**: Large, active community and ecosystem
- ✅ **Documentation**: Excellent docs and examples
- ✅ **Debugging**: Clear error messages and troubleshooting

## Migration Checklist

- [ ] Remove `release-please-config.json`
- [ ] Remove `.github/workflows/release-please.yml`
- [ ] Install `@changesets/cli`
- [ ] Run `npx @changesets/cli init`
- [ ] Create new GitHub Action workflow
- [ ] Configure npm token in GitHub secrets
- [ ] Test with first changeset
- [ ] Update documentation
- [ ] Train team on new workflow

---

*Decision made: 2026-01-06*
*Status: Ready for implementation*
