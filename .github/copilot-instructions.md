# GitHub Copilot Instructions for effect-native/effect-native

**ALWAYS** follow these instructions first and only fallback to additional search and context gathering if the information in these instructions is incomplete or found to be in error.

## Repository Overview

This is the **effect-native fork** of the Effect TypeScript framework monorepo. It maintains custom packages in `packages-native/` while allowing contributions back to upstream Effect-TS/effect.

### Key Repository Facts

- **Package Manager**: pnpm 10.4.0+ (NEVER use npm or yarn)
- **Language**: TypeScript with strict configuration
- **Test Framework**: Vitest with custom configuration
- **Monorepo**: 35+ packages using pnpm workspaces
- **Build System**: TypeScript project references with incremental compilation
- **Fork Structure**: 
  - `packages/`: Upstream Effect packages (effect, platform, cli, etc.)
  - `packages/ai/`: AI-related packages (openai, anthropic, etc.)
  - `packages-native/`: Fork-specific custom packages using `@effect-native/` namespace

## Working Effectively

### Initial Setup (Required First Time)

Install pnpm globally and set up the repository:

```bash
npm install -g pnpm@10.4.0
pnpm install  # Takes ~1.5 minutes. NEVER CANCEL - set timeout to 3+ minutes
```

**CRITICAL TIMING**: Install takes 1-2 minutes. NEVER CANCEL early - always set timeout to 180+ seconds.

### Essential Commands with Exact Timing

**NEVER CANCEL BUILDS OR TESTS** - Always use adequate timeouts:

```bash
# Installation and dependency management
pnpm install                    # ~1.5 minutes - NEVER CANCEL, timeout: 180+ seconds

# Code generation and building  
pnpm codegen                    # ~4 seconds - generates package entrypoints
pnpm clean                      # ~1 second - clean build artifacts

# TypeScript checking and compilation
pnpm check                      # ~1.5 minutes - TypeScript type checking, timeout: 120+ seconds
pnpm build                      # CURRENTLY FAILS - has TypeScript compilation errors

# Testing
pnpm test                       # ~10 minutes for full suite - NEVER CANCEL, timeout: 720+ seconds
pnpm test --shard 2/4           # ~2 minutes for 1/4 of tests (avoids Docker tests), timeout: 180+ seconds  
pnpm test <pattern>             # Run tests matching pattern
pnpm vitest test/Array.test.ts  # Run single test file (~4 seconds)
pnpm coverage                   # Run tests with coverage (~15+ minutes), timeout: 1200+ seconds

# Code quality
pnpm lint                       # ~35 seconds - ESLint checking
pnpm lint-fix                   # ~35 seconds - auto-fix lint issues  
pnpm circular                   # ~15 seconds - check circular dependencies
pnpm test-types --target '>=5.4' # ~1.5 minutes - run type-level tests, timeout: 120+ seconds

# Documentation
pnpm docgen                     # Generate API documentation
pnpm changeset                  # Create changeset for changes
```

### **CRITICAL BUILD STATUS**

**⚠️ IMPORTANT**: The repository currently has TypeScript compilation errors that prevent `pnpm build` from completing successfully. The errors are in:
- `packages/platform/src/HttpApiClient.ts`
- `packages/experimental/src/EventJournal.ts` 
- `packages/experimental/src/EventLogEncryption.ts`
- `packages/platform-node/src/internal/httpIncomingMessage.ts`
- `packages/platform-browser/src/internal/httpClient.ts`

**DO NOT** attempt to fix these existing compilation errors unless specifically tasked to do so. These are pre-existing issues unrelated to your changes.

**Tests and linting work correctly** - use these for validation instead of build.

## Validation Requirements

### Before Making Changes
Always run these commands to understand the current state:
```bash
pnpm install     # Ensure dependencies are installed
pnpm test --run --reporter=basic test/Array.test.ts  # Quick test to verify setup
pnpm lint        # Check current lint status
```

### After Making Changes
ALWAYS run these validation steps in order:

1. **Code Generation** (if you modified package structure):
   ```bash
   pnpm codegen  # ~4 seconds
   ```

2. **Linting** (REQUIRED):
   ```bash
   pnpm lint-fix   # ~35 seconds - auto-fix issues
   pnpm lint       # ~35 seconds - verify no remaining issues
   ```

3. **Type Checking** (REQUIRED):
   ```bash
   pnpm check      # ~1.5 minutes, timeout: 120+ seconds
   ```

4. **Testing** (REQUIRED):
   ```bash
   # Test your specific changes first
   pnpm vitest --run test/YourModifiedFile.test.ts
   
   # Then run broader test suite (use shard 2/4 to avoid Docker-dependent tests)
   pnpm test --run --reporter=basic --shard 2/4  # ~2 minutes, timeout: 180+ seconds
   ```

5. **Circular Dependencies** (if you added new imports):
   ```bash
   pnpm circular  # ~15 seconds
   ```

6. **Type-level Tests** (for complex type changes):
   ```bash
   pnpm test-types --target '>=5.4'  # ~1.5 minutes, timeout: 120+ seconds
   ```

### Testing Strategy

- **Quick validation**: Run single test files with `pnpm vitest test/SpecificFile.test.ts`
- **Moderate validation**: Run shard 2/4 with `pnpm test --run --shard 2/4` (avoids Docker-dependent tests)
- **Full validation**: Run complete test suite with `pnpm test --run` (only for major changes)
- **Test files location**: Tests are in `test/` directories within each package
- **Test framework**: Uses Vitest with Effect.gen for readable async test code
- **Note**: Some tests (e.g., SQL database tests) require Docker and may fail in restricted environments

## Package Development

### Working on Existing Packages

Most packages are in `packages/` directory. Key packages:
- `packages/effect/` - Core Effect library
- `packages/platform/` - Cross-platform utilities  
- `packages/cli/` - Command-line interface utilities
- `packages/schema/` - Data validation and serialization
- `packages/stream/` - Streaming data processing

### Working on Custom Fork Packages

Custom packages are in `packages-native/` directory:
- **MUST** use `@effect-native/` namespace in package.json
- Follow same structure as packages in `packages/`
- Include standard configs (tsconfig, vitest, docgen)
- Use `@effect/build-utils` for building
- Depend on `effect` as peer dependency

### Adding New Dependencies

When adding dependencies to package.json files:
```bash
# Add to specific package
cd packages/your-package && pnpm add dependency-name

# Add to root (rare)
pnpm add -D dependency-name

# Always run install after changes
pnpm install
```

## Code Style and Patterns

### Effect Design Patterns
1. **Effect System**: All async operations use Effect type for composable error handling
2. **Layers**: Dependencies provided through Layer composition  
3. **Services**: Use Context.Tag for type-safe dependency injection
4. **Schemas**: Data validation via Schema module
5. **Pipeable API**: All modules follow pipe-first functional programming style

### JSDoc Requirements
All public APIs MUST include:
- `@since` tag with version
- `@example` tag with usage example  
- Brief description of functionality
- `@category` tag for documentation organization (optional)

### Import Organization
- Use `import * as ModuleName` for Effect modules
- Follow existing import patterns in each package
- Run `pnpm lint-fix` to auto-organize imports

## Fork-Specific Workflows

### Contributing to Upstream Effect
```bash
git checkout main
git pull upstream main  
git checkout -b feature/my-contribution
# Work ONLY in packages/ directory
git push origin feature/my-contribution
# Create PR to Effect-TS/effect
```

### Working on Custom Fork Features  
```bash
git checkout effect-native/main
# Work in packages-native/ directory
git push origin effect-native/main
```

## Common Tasks

### Running Specific Package Tests
```bash
# Test specific package
cd packages/effect && pnpm test

# Test specific file in package  
cd packages/effect && pnpm vitest test/Array.test.ts
```

### Building Specific Package
**NOTE**: Full builds currently fail due to compilation errors. Individual package builds may work:
```bash
cd packages/your-package && pnpm build
```

### Adding a Changeset (Required for Releases)
```bash
pnpm changeset  # Follow prompts to describe changes
```

### Checking Package Dependencies
```bash
pnpm list --depth=0        # Show top-level dependencies
pnpm list --depth=1        # Show with one level of dependencies
```

## Troubleshooting

### Common Issues and Solutions

**"pnpm command not found"**:
```bash
npm install -g pnpm@10.4.0
```

**"No test files found"**:
- Ensure you're running tests from repository root
- Use full path: `pnpm vitest test/Array.test.ts` not `packages/effect/test/Array.test.ts`

**"Module not found" errors**:
```bash
pnpm install  # Reinstall dependencies
pnpm codegen  # Regenerate package exports
```

**Build failures**:
- The repository currently has known TypeScript compilation issues
- Focus on testing and linting for validation instead
- Only attempt to fix build issues if specifically assigned

**Network/dependency issues**:
- Some dependencies may fail to download in restricted environments
- The modified package.json has workarounds for common issues
- Proceed with available functionality if some packages fail to install

### File Locations Reference

```
/
├── packages/                 # Upstream Effect packages
│   ├── effect/              # Core Effect library
│   ├── platform/            # Platform utilities  
│   ├── cli/                 # CLI utilities
│   └── ...                  # Other packages
├── packages-native/         # Fork-specific packages (@effect-native/ namespace)
│   ├── bun-test/           # Example custom package
│   └── example/            # Example custom package
├── scripts/                # Build and maintenance scripts
├── .github/workflows/      # CI/CD workflows
├── package.json            # Root package configuration
├── pnpm-workspace.yaml     # Workspace configuration
├── vitest.workspace.ts     # Test configuration
└── tsconfig.*.json         # TypeScript configurations
```

### Expected Command Output
When commands work correctly:
- `pnpm install`: Should complete with "Done in ~1m 21s"
- `pnpm test --run --shard 1/4`: Should show "Test Files: 162 passed, Tests: 1952 passed" 
- `pnpm lint`: Should complete with no errors (after lint-fix)
- `pnpm circular`: Should complete with no circular dependency warnings
- `pnpm codegen`: Should complete with "Done" for all packages

This repository represents a sophisticated TypeScript monorepo with comprehensive tooling. Always respect the timing requirements and use adequate timeouts to avoid premature cancellation of long-running operations.