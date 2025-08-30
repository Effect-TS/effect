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

## Critical Development Rules

⚠️ **Mandatory workflow for any TypeScript development:**
1. Create/modify function
2. Run `pnpm lint --fix` immediately after editing
3. Check TypeScript compilation
4. Write comprehensive tests with `@effect/vitest`
5. Validate JSDoc documentation compiles with `pnpm docgen`

⚠️ **Never violate these patterns:**
- **Never use `try-catch` in `Effect.gen`** - use Effect error handling
- **Never use type assertions** (`as never`, `as any`) - maintain type safety
- **Always use `return yield*`** for errors and interrupts
- **100% JSDoc coverage required** with working examples

### Local CI Parity

- Always run `pnpm ok` after making changes and before pushing. This mirrors our GitHub checks (types, lint, circular, codegen + diff, test-types target, docgen, codemod, build) so failures show up locally first.

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

### Essential Effect Patterns

**Concurrency & Control Flow:**
- Use `Effect.all` for concurrent operations (not sequential await)
- Use `Effect.forEach` over manual loops for collections
- Use `Effect.raceAll` for timeout scenarios
- Use `Fiber` for advanced concurrency control
- Use `Queue` for producer/consumer patterns

**Error Handling:**
- Use `Effect.catchTag` for specific error handling
- Define custom error types extending `Data.TaggedError`
- Use `return yield*` for errors and interrupts (never throw)
- Implement proper error context with custom error types

**Resource Management:**
- Use `Effect.acquireUseRelease` for proper cleanup
- Use `Ref` for mutable state management in Effect context
- Use `Effect.cached` for expensive computations
- Implement proper batching with `Effect.forEach` options

**Type Safety:**
- Use branded types for domain-specific values
- Always validate inputs with `Schema`
- Use proper variance annotations (`in`/`out`)
- Leverage `Schema` for runtime validation and type inference

### Common Pitfalls to Avoid

- **Never mix Promise-based and Effect-based code directly**
- **Never use `Effect.runSync` in production code**
- **Never create Effects inside loops without proper batching**
- **Never ignore fiber interruption in long-running operations**
- **Never create circular dependencies between services**

### Key Modules

- **Effect**: Core effect system for async operations, error handling, and concurrency
- **Stream**: Streaming data processing with backpressure
- **Layer**: Dependency injection and resource management
- **Schema**: Runtime type validation and serialization
- **Platform**: Cross-platform I/O operations (HTTP, FileSystem, etc.)

### Testing Approach

- Tests use `@effect/vitest` with custom configuration in `vitest.shared.ts`
- Test files located in `test/` directories
- Use `it.effect` pattern for Effect-based tests
- Use `Effect.gen` for readable async test code
- Use `assert` methods instead of `expect` for Effect tests
- Utilize `TestClock` for time-dependent testing
- Prefer property-based testing with FastCheck where applicable

### Build System

- TypeScript project references for incremental compilation
- `@effect/build-utils` handles package bundling
- Each package has standard tsconfig files:
  - `tsconfig.json`: Main config
  - `tsconfig.src.json`: Source compilation
  - `tsconfig.test.json`: Test compilation
  - `tsconfig.build.json`: Build references

### packages-native isolation rule

- Do NOT reference workspace upstream packages from `packages-native/*` TypeScript configs.
  For example, do not add project references to `../../packages/effect/tsconfig.build.json` or
  `../../packages/platform/tsconfig.build.json`.
- `packages-native/*` must depend on released versions of upstream packages via peer/dev dependencies as appropriate,
  not on workspace source. This keeps native forks isolated from upstream internals and prevents
  workspace-wide compile spillover in CI builds.

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
- `@example` tag with **compilable** usage example
- Brief description of functionality
- `@category` tag for documentation organization (optional)
- Proper import patterns in examples
- Real-world, practical usage demonstrations
- **100% JSDoc coverage** - no exceptions
- All examples must compile with `pnpm docgen`

### Changeset Process

Before committing features:
1. Run `pnpm changeset`
2. Select appropriate semver level (patch/minor/major)
3. Write clear changeset description
4. Reference issues with "closes #123" in commit messages

## Advanced Development Patterns

### Performance & Resource Management
- Use `Effect.cached` for expensive computations
- Use `Semaphore` for controlling concurrent access
- Implement structured concurrency with `Effect.fork`
- Use `Effect.acquireUseRelease` for proper resource cleanup
- Use streaming (`Stream`) for memory-efficient large data processing

### Type-Level Programming
- Use branded types for domain-specific type safety
- Implement phantom types for compile-time constraints
- Leverage conditional types for complex type constraints
- Use proper variance annotations (`in`/`out`)

### Error Architecture
- Create hierarchical error types with `Data.TaggedError`
- Use `Effect.mapError` for translating between error layers
- Implement centralized error translation strategies
- Never mix Promise-based and Effect-based error handling

### Debugging & Development
- Use `Effect.tap` for side-effect debugging without changing flow
- Use `Logger` service for structured logging in development
- Use `TestClock` and `TestContext` for deterministic testing
- Use `Effect.gen` with proper yielding for readable async code

### Service Design
- Create platform-agnostic service interfaces
- Use `Context.Tag` with proper type constraints
- Design services to be composable through Layer composition
- Avoid circular dependencies between services
