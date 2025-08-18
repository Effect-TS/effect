# Effect Native Fork Workflow

This repository is a fork of [Effect-TS/effect](https://github.com/Effect-TS/effect) that maintains custom packages while allowing contributions back to upstream.

## Repository Structure

```
effect/
├── packages/           # Upstream Effect packages (DO NOT add custom packages here)
├── packages-native/    # Custom fork-specific packages (@effect-native/*)
└── scratchpad/        # Local development experiments
```

## Git Remotes Configuration

- **origin**: `git@github.com:effect-native/effect.git` (your fork)
- **upstream**: `git@github.com:Effect-TS/effect.git` (original Effect repo)

## Branch Strategy

### Main Branches

1. **`main`** - Mirrors upstream/main, used for upstream contributions
2. **`effect-native/main`** - Fork's main branch with custom packages

### Working with Branches

```bash
# For upstream contributions
git checkout main
git pull upstream main
git checkout -b feature/my-upstream-contribution
# ... make changes to packages/ only
git push origin feature/my-upstream-contribution
# Create PR to Effect-TS/effect

# For custom packages
git checkout effect-native/main
git pull origin effect-native/main
git checkout -b feature/my-custom-package
# ... work in packages-native/
git push origin feature/my-custom-package
# Create PR to effect-native/effect
```

## Syncing with Upstream

```bash
# Update main branch
git checkout main
git fetch upstream
git merge upstream/main
git push origin main

# Merge upstream changes into fork
git checkout effect-native/main
git merge main
git push origin effect-native/main
```

## Creating Custom Packages

1. Create package in `packages-native/` directory
2. Use `@effect-native/` npm namespace
3. Follow Effect's package structure and conventions

Example:
```bash
# Create new package
mkdir -p packages-native/my-package/{src,test}
cd packages-native/my-package

# Copy structure from example package
# Edit package.json to set name as @effect-native/my-package
```

## Publishing Custom Packages

Custom packages are published to npm under the `@effect-native/` namespace:

```bash
cd packages-native/my-package
pnpm build
pnpm publish
```

## Safety Features

### Pre-push Hook

A git hook prevents accidentally pushing `packages-native/` to upstream:
- Located at `.git/hooks/pre-push`
- Blocks pushes to upstream that include custom packages
- Warns about pnpm-workspace.yaml changes

### Directory Separation

- `packages/` - Only upstream packages
- `packages-native/` - Only custom packages
- Never mix custom and upstream packages

## Common Workflows

### Contributing to Upstream Effect

```bash
# 1. Ensure main is up to date
git checkout main
git pull upstream main

# 2. Create feature branch
git checkout -b fix/issue-123

# 3. Make changes (only in packages/)
# 4. Test changes
pnpm test

# 5. Push to your fork
git push origin fix/issue-123

# 6. Create PR to Effect-TS/effect
```

### Adding a Custom Package

```bash
# 1. Work on effect-native/main branch
git checkout effect-native/main

# 2. Create package in packages-native/
mkdir packages-native/new-package

# 3. Develop and test
pnpm build
pnpm test

# 4. Commit and push
git add packages-native/new-package
git commit -m "Add @effect-native/new-package"
git push origin effect-native/main
```

### Updating Custom Packages with Upstream Changes

```bash
# 1. Sync main with upstream
git checkout main
git pull upstream main

# 2. Merge into fork branch
git checkout effect-native/main
git merge main

# 3. Resolve any conflicts
# 4. Test custom packages still work
pnpm test

# 5. Push updates
git push origin effect-native/main
```

## Important Rules

1. **Never** add custom packages to `packages/` directory
2. **Never** push `packages-native/` to upstream
3. **Always** use `@effect-native/` namespace for custom packages
4. **Always** create upstream PRs from `main` branch
5. **Keep** `main` branch clean - no custom changes

## Troubleshooting

### Accidentally committed to wrong branch?

```bash
# If you added custom package to main branch
git checkout main
git reset --hard upstream/main
git checkout effect-native/main
git cherry-pick <commit-hash>
```

### Pre-push hook blocking legitimate push?

The hook prevents pushing `packages-native/` to upstream. If you need to bypass (not recommended):
```bash
git push --no-verify upstream branch-name
```

### Merge conflicts after upstream sync?

Focus on:
1. Keep upstream's changes in `packages/`
2. Keep your changes in `packages-native/`
3. Carefully review `pnpm-workspace.yaml` and `package.json`

## Questions?

- For Effect-related questions: [Effect Discord](https://discord.gg/effect-ts)
- For fork-specific issues: Create issue in effect-native/effect