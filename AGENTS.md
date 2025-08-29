This file provides guidance when working with code in this repository.

## Repository Overview

This is the **effect-native fork** of the Effect TypeScript framework. It maintains custom packages while allowing contributions back to upstream Effect-TS/effect.

### Fork-Specific Setup

- **Git remotes**: `origin` points to `effect-native/effect`, `upstream` points to `Effect-TS/effect`
- **Branch strategy**:
  - `main`: Clean mirror of upstream for contributions
  - `effect-native/main`: Fork's branch with custom packages
- **Custom packages**: Located in `packages-native/`, use `@effect-native/` namespace
- **Pre-push hook**: Prevents accidentally pushing custom packages to upstream

## Development Commands

### Building
```bash
pnpm build              # Build all packages
pnpm codegen           # Re-generate package entrypoints
pnpm clean             # Clean build artifacts
```

### Testing
```bash
pnpm test              # Run all tests
pnpm test <pattern>    # Run tests matching pattern
pnpm coverage          # Run tests with coverage

# Run single test file
pnpm vitest test/Effect.test.ts

# Run tests for specific package
cd packages/effect && pnpm test
```

### Code Quality
```bash
pnpm check             # TypeScript type checking
pnpm lint              # ESLint
pnpm lint-fix          # Auto-fix lint issues
pnpm circular          # Check for circular dependencies
pnpm test-types        # Run type-level tests (tstyche)
```

### Documentation
```bash
pnpm docgen            # Generate API documentation
pnpm changeset         # Create changeset for changes
```

## Architecture

### Package Structure

The monorepo uses pnpm workspaces with packages organized in:
- `packages/`: Upstream Effect packages (effect, platform, cli, etc.)
- `packages/ai/`: AI-related packages (openai, anthropic, etc.)
- `packages-native/`: Fork-specific custom packages

### Core Design Patterns

1. **Effect System**: All async operations use the Effect type for composable error handling and dependency injection
2. **Layers**: Dependencies are provided through Layer composition
3. **Services**: Use Context.Tag for type-safe dependency injection
4. **Schemas**: Data validation and serialization via Schema module
5. **Pipeable API**: All modules follow pipe-first functional programming style

### Key Modules

- **Effect**: Core effect system for async operations, error handling, and concurrency
- **Stream**: Streaming data processing with backpressure
- **Layer**: Dependency injection and resource management
- **Schema**: Runtime type validation and serialization
- **Platform**: Cross-platform I/O operations (HTTP, FileSystem, etc.)

### Testing Approach

- Tests use Vitest with custom configuration in `vitest.shared.ts`
- Test files located in `test/` directories
- Use `Effect.gen` for readable async test code
- Prefer property-based testing with FastCheck where applicable

### Build System

- TypeScript project references for incremental compilation
- `@effect/build-utils` handles package bundling
- Each package has standard tsconfig files:
  - `tsconfig.json`: Main config
  - `tsconfig.src.json`: Source compilation
  - `tsconfig.test.json`: Test compilation
  - `tsconfig.build.json`: Build references

## Fork Workflows

### Contributing to Upstream
```bash
git checkout main
git pull upstream main
git checkout -b feature/my-contribution
# Work in packages/ only
git push origin feature/my-contribution
# Create PR to Effect-TS/effect
```

### Working on Custom Packages
```bash
git checkout effect-native/main
# Work in packages-native/
git push origin effect-native/main
```

### Syncing with Upstream
```bash
git checkout main
git pull upstream main
git checkout effect-native/main
git merge main
```

## Package Conventions

### Creating New Packages

Custom packages in `packages-native/` should:
1. Use `@effect-native/` namespace in package.json
2. Follow same structure as packages in `packages/`
3. Include standard configs (tsconfig, vitest, docgen)
4. Use `@effect/build-utils` for building
5. Depend on `effect` as peer dependency

### JSDoc Requirements

All public APIs must include:
- `@since` tag with version
- `@example` tag with usage example
- Brief description of functionality
- `@category` tag for documentation organization (optional)

### Changeset Process

Before committing features:
1. Run `pnpm changeset`
2. Select appropriate semver level (patch/minor/major)
3. Write clear changeset description
4. Reference issues with "closes #123" in commit messages
