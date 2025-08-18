# Effect Native Packages

This directory contains custom packages maintained in the `effect-native/effect` fork.

## Important Notes

- These packages are **NOT** part of the upstream Effect repository
- All packages here should use the `@effect-native/` npm namespace
- These packages should never be pushed to the upstream repository
- When contributing to upstream, work from the `main` branch, not `effect-native/main`

## Package Naming Convention

All packages in this directory should be published under the `@effect-native/` namespace to distinguish them from official Effect packages.

Example:
- `@effect-native/my-package` ✅
- `@effect/my-package` ❌ (reserved for official packages)

## Directory Structure

```
packages-native/
├── my-package/
│   ├── src/
│   ├── test/
│   ├── package.json
│   └── tsconfig.json
└── another-package/
    ├── src/
    ├── test/
    ├── package.json
    └── tsconfig.json
```

## Development Workflow

1. Create new packages in this directory
2. Follow the same structure and conventions as packages in `packages/`
3. Use the Effect monorepo tooling (pnpm, vitest, etc.)
4. Ensure your package.json uses the `@effect-native/` namespace