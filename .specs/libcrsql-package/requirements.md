# Requirements Specification: @effect-native/libcrsql Package

## FR1 - Functional Requirements

### FR1.1 Core Package Functionality
- **FR1.1.1**: Package MUST be published as `@effect-native/libcrsql@0.16.3`
- **FR1.1.2**: Package MUST include ALL cr-sqlite extension binaries from vlcn-io/cr-sqlite v0.16.3 release
- **FR1.1.3**: Root export MUST provide `pathToCrSqliteExtension: string`
- **FR1.1.4**: Root export MUST provide `getCrSqliteExtensionPathSync(platform?): string`
- **FR1.1.5**: Root primary export MUST auto-detect current platform and return correct binary path
- **FR1.1.6**: Returned path MUST be absolute and point to working cr-sqlite extension binary
- **FR1.1.7**: Static paths subpath `@effect-native/libcrsql/paths` MUST export per-platform absolute string constants; module may compute them at import time using Node built-ins (no network or filesystem writes)

### FR1.2 Platform Detection and Support
- **FR1.2.1**: MUST support macOS Apple Silicon (darwin-aarch64)
- **FR1.2.2**: MUST support macOS Intel (darwin-x86_64)
- **FR1.2.3**: MUST support Linux ARM64 (linux-aarch64)
- **FR1.2.4**: MUST support Linux x86_64 (linux-x86_64)
- **FR1.2.5**: MUST support Windows x86_64 (win-x86_64)
- **FR1.2.6**: MUST support Windows i686 (win-i686)
- (Removed) Android and iOS support for this release to reduce scope and ensure verified quality
- **FR1.2.9**: Platform detection MUST use Node.js process.platform and process.arch
- **FR1.2.10**: MUST throw descriptive error for unsupported platform combinations

### FR1.3 Effect API (optional subpath)
- **FR1.3.1**: MUST provide Effect-based function in `@effect-native/libcrsql/effect`: `getCrSqliteExtensionPath`
- **FR1.3.2**: Effect function MUST accept optional platform parameter
- **FR1.3.3**: Effect function MUST return `Effect<string, PlatformNotSupportedError>`
- **FR1.3.4**: MUST export Platform union type with all supported platform strings
- **FR1.3.5**: MUST provide PlatformNotSupportedError extending Data.TaggedError

### FR1.4 Package Integration
- **FR1.4.1**: MUST work with standard SQLite loadExtension() calls
- **FR1.4.2**: MUST follow Effect library package structure and conventions
- **FR1.4.3**: MUST include proper package.json with correct dependencies
- **FR1.4.4**: MUST include all standard Effect package configuration files

## NFR2 - Non-Functional Requirements

### NFR2.1 Performance Requirements
- **NFR2.1.1**: Path resolution MUST complete in <100ms
- **NFR2.1.2**: Package import MUST have minimal startup overhead
- **NFR2.1.3**: Binary file access MUST not require additional I/O operations
- **NFR2.1.4**: Memory footprint of package logic MUST be <1MB

### NFR2.2 Reliability Requirements
- **NFR2.2.1**: Platform detection MUST be 100% accurate on supported platforms
- **NFR2.2.2**: Package MUST work identically across all Node.js environments (>= 18)
- **NFR2.2.3**: Binary paths MUST remain stable across package versions
- **NFR2.2.4**: MUST handle missing binary files gracefully with clear errors

### NFR2.3 Usability Requirements
- **NFR2.3.1**: Primary use case MUST require only single import statement
- **NFR2.3.2**: MUST work with zero configuration on all supported platforms
- **NFR2.3.3**: Error messages MUST clearly indicate required action for user
- **NFR2.3.4**: API MUST be discoverable through IDE auto-completion

### NFR2.4 Maintainability Requirements
- **NFR2.4.1**: Code MUST follow Effect library TypeScript patterns
- **NFR2.4.2**: MUST have 100% JSDoc coverage with working @example tags
- **NFR2.4.3**: MUST pass all Effect library quality gates (lint, typecheck, docgen)
- **NFR2.4.4**: Binary update process MUST be documented and reproducible

### NFR2.5 Portability Requirements
- **NFR2.5.1**: MUST work in all major Node.js package managers (npm, yarn, pnpm, bun)
- **NFR2.5.2**: MUST work in both CommonJS and ESM environments
- **NFR2.5.3**: MUST work in bundled applications (webpack, rollup, etc.)
- **NFR2.5.4**: MUST work in containerized environments (Docker, etc.)

## TC3 - Technical Constraints

### TC3.1 Effect Library Constraints
- **TC3.1.1**: MUST NOT use try-catch blocks inside Effect.gen generators
- **TC3.1.2**: MUST NOT use type assertions (as any, as never, as unknown)
- **TC3.1.3**: MUST use `return yield*` pattern for errors/interrupts in Effect.gen
- **TC3.1.4**: MUST use Data.TaggedError for all custom error types
- **TC3.1.5**: MUST follow Effect library module organization patterns

### TC3.2 Package Size Constraints
- **TC3.2.1**: Total package size MUST be <100MB (reasonable for bundled binaries)
- **TC3.2.2**: Individual binary size MUST match upstream without modification
- **TC3.2.3**: MUST NOT compress or modify upstream binaries in any way
- **TC3.2.4**: MUST include all platform binaries in single package (no conditional installs)

### TC3.3 Security Constraints
- **TC3.3.1**: MUST NOT use postinstall scripts (security best practice)
- **TC3.3.2**: MUST NOT download binaries at runtime
- **TC3.3.3**: All binaries MUST be included in published package
- **TC3.3.4**: MUST verify binary integrity during build process if checksums available

### TC3.4 Compatibility Constraints
- **TC3.4.1**: MUST support Node.js >= 18
- **TC3.4.2**: MUST work with TypeScript >= 4.7
- **TC3.4.3**: MUST be compatible with Effect library version constraints
- **TC3.4.4**: MUST NOT introduce dependencies outside Effect ecosystem

## DR4 - Data Requirements

### DR4.1 Binary Asset Requirements
- **DR4.1.1**: MUST include crsqlite-darwin-aarch64.zip contents
- **DR4.1.2**: MUST include crsqlite-darwin-x86_64.zip contents
- **DR4.1.3**: MUST include crsqlite-linux-aarch64.zip contents
- **DR4.1.4**: MUST include crsqlite-linux-x86_64.zip contents
- **DR4.1.5**: MUST include crsqlite-win-x86_64.zip contents
- **DR4.1.6**: MUST include crsqlite-win-i686.zip contents
// Android and iOS asset requirements intentionally omitted in this release

### DR4.2 File Organization Requirements
- **DR4.2.1**: Binaries MUST be organized in lib/ directory by platform
- **DR4.2.2**: Platform directories MUST follow naming convention: lib/{platform}/
- **DR4.2.3**: Original binary filenames MUST be preserved within platform directories
- **DR4.2.4**: MUST maintain executable permissions on binaries where applicable

### DR4.3 Metadata Requirements
- **DR4.3.1**: MUST track source URL for each binary
- **DR4.3.2**: MUST track vlcn-io/cr-sqlite version (0.16.3)
- **DR4.3.3**: MUST include LICENSE information for redistributed binaries
- **DR4.3.4**: MUST document binary update process and sources

## IR5 - Integration Requirements

### IR5.1 Effect Library Integration
- **IR5.1.1**: MUST integrate with @effect/platform for platform detection
- **IR5.1.2**: MUST use Effect error handling patterns throughout
- **IR5.1.3**: MUST follow Effect module export conventions
- **IR5.1.4**: MUST work seamlessly with other Effect-based SQLite libraries

### IR5.2 SQLite Integration
- **IR5.2.1**: Returned paths MUST work with node-sqlite3 loadExtension()
- **IR5.2.2**: MUST work with better-sqlite3 loadExtension()
- **IR5.2.3**: MUST work with any SQLite library accepting extension paths
- **IR5.2.4**: Binary compatibility MUST match SQLite version requirements

### IR5.3 Build System Integration
- **IR5.3.1**: MUST integrate with existing pnpm workspace configuration
- **IR5.3.2**: MUST work with @effect/build-utils build process
- **IR5.3.3**: MUST pass all standard Effect package validation steps
- **IR5.3.4**: MUST work with changeset-based version management

## DEP6 - Dependencies

### DEP6.1 Runtime Dependencies
- **DEP6.1.1**: Root export MUST have zero external runtime dependencies (Node.js only)
- **DEP6.1.2**: `@effect-native/libcrsql/paths` MUST have zero external runtime dependencies
- **DEP6.1.3**: `@effect-native/libcrsql/effect` depends on `effect` (peer) and may depend on `@effect/platform` (peer)

### DEP6.2 Development Dependencies
- **DEP6.2.1**: @effect/build-utils (for package building)
- **DEP6.2.2**: @effect/vitest (for testing the effect entrypoint)
- **DEP6.2.3**: @effect/docgen (for documentation generation)
- **DEP6.2.4**: Standard Effect package development tools

### DEP6.3 External Dependencies
- **DEP6.3.1**: vlcn-io/cr-sqlite v0.16.3 release binaries (build-time only)
- **DEP6.3.2**: Node.js platform detection APIs (process.platform, process.arch)
- **DEP6.3.3**: File system access for binary path resolution

### DEP6.4 Constraint Dependencies
- **DEP6.4.1**: Root and paths entrypoints MUST NOT depend on any external libraries at runtime
- **DEP6.4.2**: MUST NOT require global installations or system dependencies
- **DEP6.4.3**: MUST NOT depend on network access after installation
- **DEP6.4.4**: MUST NOT depend on platform-specific Node.js features beyond standard APIs

## SC7 - Success Criteria

### SC7.1 Technical Success Criteria
- **SC7.1.1**: `pnpm build` completes successfully with zero errors
- **SC7.1.2**: `pnpm check` passes TypeScript compilation with zero errors
- **SC7.1.3**: `pnpm lint` passes with zero violations
- **SC7.1.4**: `pnpm docgen` generates documentation with zero errors
- **SC7.1.5**: `pnpm test` achieves >95% code coverage

### SC7.2 Functional Success Criteria
- **SC7.2.1**: Package installs successfully via `pnpm add @effect-native/libcrsql`
- **SC7.2.2**: Import `{pathToCrSqliteExtension}` resolves to valid file path
- **SC7.2.3**: All 6 supported platforms return working binary paths (macOS arm64/x64, Linux arm64/x64, Windows x64/i686)
- **SC7.2.4**: SQLite loadExtension() succeeds with returned paths
- **SC7.2.5**: Unsupported platforms throw clear, actionable errors
 - **SC7.2.6**: `@effect-native/libcrsql/paths` exports absolute strings with zero external dependencies and no network/FS side effects
 - **SC7.2.7**: Effect entrypoint works when `effect` is installed; root/paths work without it
 - **SC7.2.8**: Each supported platform is personally verified by maintainer before release; unverified platforms are excluded

### SC7.3 Quality Success Criteria
- **SC7.3.1**: 100% JSDoc coverage with compilable @example tags
- **SC7.3.2**: All public APIs documented with usage examples
- **SC7.3.3**: Test suite covers all platform combinations
- **SC7.3.4**: Error conditions properly tested and documented
- **SC7.3.5**: Package follows all Effect library conventions

### SC7.4 User Experience Success Criteria
- **SC7.4.1**: Single import statement provides working functionality
- **SC7.4.2**: Zero configuration required for standard use cases
- **SC7.4.3**: Works identically across all supported platforms
- **SC7.4.4**: Error messages guide users to correct solutions
- **SC7.4.5**: Package installation time <30 seconds on typical connections

### SC7.5 Integration Success Criteria
- **SC7.5.1**: Works seamlessly with existing Effect-based applications
- **SC7.5.2**: No conflicts with other packages in Effect ecosystem
- **SC7.5.3**: Properly integrates with monorepo build and release processes
- **SC7.5.4**: Version management aligns with fork maintenance strategy
- **SC7.5.5**: Future updates can be performed following documented process
