# Feature Instructions: @effect-native/libcrsql Package

## Overview and User Stories

We support three usage styles to meet developers where they are:

1) Typical Node.js developer
- As a Node.js dev, I just want a working path to the cr-sqlite extension as a string with zero fuss. No Effect, no ceremony, just a path I can pass to `loadExtension()`.

2) Power user (manual platform selection)
- As a power user, I want to import the exact path for a specific platform/arch as a plain string, with zero side effects, without this package importing other modules or executing anything at import time.

3) Fully Effect user
- As an Effect user, I want an idiomatic, typed Effect API (Layer/Service available) with branded types and proper TaggedError failures so I can compose it in Effects.

**Problem Statement**: The existing `@vlcn.io/crsqlite` package has been abandoned for 2 years and no longer works, leaving developers without a reliable way to access cr-sqlite extension binaries for their applications. Different users also have different expectations: some want dead-simple strings, others want total control, and Effect users want full typed integration.

**Solution**: Create a new `@effect-native/libcrsql` package that bundles all cr-sqlite extension binaries from the official vlcn-io/cr-sqlite v0.16.3 release and offers multi-entrypoint APIs:
- Root (zero external runtime deps): `pathToCrSqliteExtension` and `getCrSqliteExtensionPathSync()` for simple string paths.
- Static paths subpath: `@effect-native/libcrsql/paths` exporting per-platform string constants with no side effects.
- Effect subpath: `@effect-native/libcrsql/effect` exporting idiomatic Effect APIs and services.

## Core Requirements

### Functional Requirements
- **FR1**: Package must include all cr-sqlite extension binaries from v0.16.3 release
- **FR2**: Must provide a simple API: `import {pathToCrSqliteExtension} from "@effect-native/libcrsql"`
- **FR3**: Must automatically detect current platform and return correct extension path
- **FR4**: Must work with standard SQLite `loadExtension()` calls
- **FR5**: Package version must match upstream: `0.16.3`

### Platform Support Requirements
- **FR6**: macOS (Apple Silicon - darwin-aarch64)
- **FR7**: macOS (Intel - darwin-x86_64) 
- **FR8**: Linux (ARM64 - linux-aarch64)
- **FR9**: Linux (x86_64 - linux-x86_64)
- **FR10**: Windows (x86_64 - win-x86_64)
- **FR11**: Windows (i686 - win-i686)

## Technical Specifications

### Package Structure
```
packages-native/libcrsql/
├── package.json                 # @effect-native/libcrsql@0.16.3
├── src/
│   └── index.ts                # Main API module
├── lib/                        # Extracted extension binaries
│   ├── darwin-aarch64/
│   ├── darwin-x86_64/
│   ├── linux-aarch64/
│   ├── linux-x86_64/
│   ├── win-x86_64/
│   ├── win-i686/
│   
├── test/
│   └── index.test.ts
└── [standard Effect package configs]
```

### API Design
```typescript
// Primary API (root, zero external deps) - platform auto-detection
export declare const pathToCrSqliteExtension: string
export declare const getCrSqliteExtensionPathSync: (platform?: Platform) => string

// Static absolute paths (minimal init, zero external deps)
// import { darwin_aarch64, linux_x86_64, ... } from "@effect-native/libcrsql/paths"
export declare const darwin_aarch64: string // absolute
export declare const darwin_x86_64: string  // absolute
export declare const linux_aarch64: string  // absolute
export declare const linux_x86_64: string   // absolute
export declare const win_x86_64: string     // absolute
export declare const win_i686: string       // absolute

// Effect API (optional subpath)
// import { getCrSqliteExtensionPath } from "@effect-native/libcrsql/effect"
export declare const getCrSqliteExtensionPath: (platform?: Platform) => Effect.Effect<string, PlatformNotSupportedError>

// Platform type definition
export type Platform = 
  | "darwin-aarch64"
  | "darwin-x86_64" 
  | "linux-aarch64"
  | "linux-x86_64"
  | "win-x86_64"
  | "win-i686"

// Error types
export class PlatformNotSupportedError extends Data.TaggedError("PlatformNotSupportedError")<{
  readonly platform: string
}>
```

### Usage Examples
```typescript
// Simple usage - auto-detect platform
import {pathToCrSqliteExtension} from "@effect-native/libcrsql"
db.loadExtension(pathToCrSqliteExtension)

// Simple sync API with explicit platform
import {getCrSqliteExtensionPathSync} from "@effect-native/libcrsql"
db.loadExtension(getCrSqliteExtensionPathSync("linux-x86_64"))

// Power user: static paths, no side effects
import { linux_x86_64 } from "@effect-native/libcrsql/paths"
db.loadExtension(linux_x86_64)

// Effect-based usage with error handling
import {getCrSqliteExtensionPath} from "@effect-native/libcrsql/effect"

const program = Effect.gen(function* () {
  const extensionPath = yield* getCrSqliteExtensionPath()
  // Use with your SQLite database
  return extensionPath
})
```

## Acceptance Criteria

### Core Functionality
- **AC1**: Package can be installed via `pnpm add @effect-native/libcrsql`
- **AC2**: Import `{pathToCrSqliteExtension}` returns valid file path for current platform
- **AC3**: Returned path points to working cr-sqlite extension binary
- **AC4**: Extension loads successfully in SQLite with `loadExtension()`
- **AC5**: All 6 supported platforms have working binaries included (macOS arm64/x64, Linux arm64/x64, Windows x64/i686)

### Quality Assurance
- **AC6**: Package follows Effect library conventions and patterns
- **AC7**: 100% JSDoc coverage with working examples
- **AC8**: Comprehensive test suite with platform detection tests
- **AC9**: TypeScript compilation passes (`pnpm check`)
- **AC10**: Linting passes (`pnpm lint`)
- **AC11**: Documentation generates without errors (`pnpm docgen`)
- **AC12**: Package builds successfully (`pnpm build`)

### Integration
- **AC13**: Works with existing Effect-based SQLite workflows
- **AC14**: No breaking changes to existing codebase
- **AC15**: Package size reasonable despite including all binaries
- **AC16**: No postinstall scripts required

## Out of Scope

### Excluded from This Implementation
- **OS1**: Dynamic downloading of binaries (security concerns with postinstall scripts)
- **OS2**: Binary compression (prioritizing simplicity over size)
- **OS3**: Version management for multiple cr-sqlite versions
- **OS4**: SQLite database wrapper or ORM functionality
- **OS5**: CRDT synchronization logic or utilities
- **OS6**: Platform detection fallbacks or warnings
- **OS7**: Optional dependencies or platform-specific installs

## Success Metrics

### Technical Metrics
- **SM1**: Zero compilation errors across all standard commands
- **SM2**: Test coverage >90% for core functionality
- **SM3**: Package size <100MB (reasonable for bundled binaries)
- **SM4**: Load time <100ms for path resolution

### User Experience Metrics
- **SM5**: Single import statement provides working extension path
- **SM6**: Zero configuration required for basic usage
- **SM7**: Clear error messages for unsupported platforms
- **SM8**: Documentation examples work out-of-the-box

## Future Considerations

### Potential Enhancements (Not in Current Scope)
- **FC1**: Add support for newer cr-sqlite versions as they're released
- **FC2**: Optimize binary storage with compression
- **FC3**: Add platform-specific packages for size optimization
- **FC4**: Integration with Effect-based SQLite wrapper libraries
- **FC5**: Add utilities for common CRDT operations
- **FC6**: Support for custom binary sources or builds

### Maintenance Strategy
- **FC7**: Monitor vlcn-io/cr-sqlite releases for updates
- **FC8**: Establish process for updating binaries
- **FC9**: Consider automated testing with actual SQLite databases
- **FC10**: Plan for deprecation of older platform support

## Testing Requirements

### Unit Tests
- **TR1**: Platform detection logic for all supported platforms
- **TR2**: Path resolution returns valid file paths  
- **TR3**: Error handling for unsupported platforms
- **TR4**: API contract compliance with TypeScript types

### Integration Tests
- **TR5**: Binary files exist and are executable where applicable
- **TR6**: Extensions load successfully in SQLite (if available in test environment)
- **TR7**: Package imports work correctly in different module systems

### Manual Testing
- **TR8**: Verify package works on macOS (both architectures)
- **TR9**: Test basic SQLite extension loading functionality
- **TR10**: Validate package installation and usage workflow

## Dependencies and Constraints

### Technical Dependencies
- **DEP1**: Effect library ecosystem (effect, platform, schema)
- **DEP2**: cr-sqlite v0.16.3 binaries from vlcn-io/cr-sqlite
- **DEP3**: Standard Effect package tooling and configuration
- **DEP4**: Node.js platform detection capabilities

### Infrastructure Constraints
- **CON1**: Package will be larger than typical npm packages due to binaries
- **CON2**: Must work across all major platforms without conditional installs
- **CON3**: Binaries are externally sourced and must be downloaded during build
- **CON4**: No runtime platform detection fallbacks (fail fast on unsupported platforms)

## Implementation Strategy

### Development Approach
1. **Download and extract** all platform binaries from v0.16.3 release
2. **Organize binaries** into platform-specific directories
3. **Implement platform detection** using Node.js process.platform and process.arch
4. **Create Effect-based API** with proper error handling
5. **Add comprehensive tests** for all platforms and error cases
6. **Ensure full JSDoc coverage** with working examples

### Risk Mitigation
- **Binary integrity**: Verify checksums if available from upstream
- **Platform detection accuracy**: Test on multiple platforms during development  
- **Package size concerns**: Monitor and document final package size
- **Legal compliance**: Ensure proper licensing for redistributed binaries
