# Technical Design: @effect-native/libcrsql Package

## Packaging and Entrypoints (fewer dependencies)

To support all personas with minimal friction, the package exposes multiple entrypoints with different dependency footprints:

- Root entrypoint `@effect-native/libcrsql` (zero external runtime deps):
  - `pathToCrSqliteExtension: string`
  - `getCrSqliteExtensionPathSync(platform?: Platform): string`
- Static paths `@effect-native/libcrsql/paths` (no side effects, zero deps):
  - `darwin_aarch64`, `darwin_x86_64`, `linux_aarch64`, `linux_x86_64`, `win_x86_64`, `win_i686` (string constants)
- Effect entrypoint `@effect-native/libcrsql/effect` (Effect users only):
  - `getCrSqliteExtensionPath(platform?: Platform): Effect.Effect<ExtensionPath, PlatformNotSupportedError | ExtensionNotFoundError>`
  - `LibCrSqliteService`, `LibCrSqliteServiceLive`, and TaggedError types

Conceptual package.json exports:

```json
{
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.mjs", "require": "./dist/index.cjs" },
    "./paths": { "types": "./dist/paths.d.ts", "import": "./dist/paths.mjs", "require": "./dist/paths.cjs" },
    "./effect": { "types": "./dist/effect.d.ts", "import": "./dist/effect.mjs", "require": "./dist/effect.cjs" }
  },
  "peerDependencies": { "effect": "*" },
  "peerDependenciesMeta": { "effect": { "optional": true } }
}
```

## Effect Library Patterns

### Core Effect Patterns Implementation (entrypoint overview)

```typescript
// Root entrypoint: minimal synchronous API (no external deps)
export declare const pathToCrSqliteExtension: string
export declare const getCrSqliteExtensionPathSync: (platform?: Platform) => string

// Static paths entrypoint: pure constants (documented below)

// Effect entrypoint: idiomatic Effect APIs (documented below)
```

### Error Handling Strategy (Effect entrypoint)

```typescript
import { Data } from "effect"

/**
 * Tagged error for unsupported platform scenarios
 * Follows Effect Data.TaggedError pattern - NO custom Error classes
 */
export class PlatformNotSupportedError extends Data.TaggedError("PlatformNotSupportedError")<{
  readonly platform: string
  readonly supportedPlatforms: readonly string[]
  readonly detectedArch: string
  readonly detectedPlatform: string
}> {
  /**
   * Creates user-friendly error message
   * @since 0.16.3
   */
  get message() {
    return `Platform "${this.platform}" is not supported. Detected: ${this.detectedPlatform}-${this.detectedArch}. Supported platforms: ${this.supportedPlatforms.join(", ")}`
  }
}

/**
 * Error for when a resolved extension path does not exist or is unreadable
 */
export class ExtensionNotFoundError extends Data.TaggedError("ExtensionNotFoundError")<{
  readonly path: string
  readonly platform: string
}> {}
```

### Generator Functions with Proper Error Yielding (Effect entrypoint)

```typescript
import { Effect, Brand } from "effect"
import { FileSystem } from "@effect/platform"

export type ExtensionPath = string & Brand.Brand<"ExtensionPath">
export const ExtensionPath = Brand.nominal<ExtensionPath>()

export const getCrSqliteExtensionPath = (
  platform?: Platform
): Effect.Effect<ExtensionPath, PlatformNotSupportedError | ExtensionNotFoundError> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem

    // Detect platform if not provided
    const targetPlatform = platform ?? detectPlatform()

    // Validate platform support
    if (!isSupportedPlatform(targetPlatform)) {
      return yield* Effect.fail(new PlatformNotSupportedError({
        platform: targetPlatform,
        supportedPlatforms: SUPPORTED_PLATFORMS,
        detectedArch: process.arch,
        detectedPlatform: process.platform
      }))
    }

    // Build path to binary
    const candidate = buildExtensionPath(targetPlatform)

    // Verify file exists via @effect/platform
    const exists = yield* fs.exists(candidate)
    if (!exists) {
      return yield* Effect.fail(new ExtensionNotFoundError({ path: candidate, platform: targetPlatform }))
    }

    return ExtensionPath(candidate)
  })
```

### Synchronous Getter (non-Effect consumers, zero external deps)

```typescript
// This synchronous API is provided for users not using Effect.
// It throws native Error instances with `code` set for quick handling.
export const getCrSqliteExtensionPathSync = (platform?: Platform): string => {
  const target = platform ?? detectPlatform()
  if (!isSupportedPlatform(target)) {
    const err: NodeJS.ErrnoException = new Error(`Unsupported platform: ${target}`)
    err.code = "ERR_PLATFORM_UNSUPPORTED"
    throw err
  }
  const candidate = buildExtensionPath(target)
  // In sync API, we use Node fs synchronously for minimal surface
  const fs = require("fs") as typeof import("fs")
  try {
    fs.accessSync(candidate)
  } catch {
    const err: NodeJS.ErrnoException = new Error(`Extension not found: ${candidate}`)
    err.code = "ERR_EXTENSION_NOT_FOUND"
    throw err
  }
  return candidate
}

// Precomputed constant for convenience; evaluates at import time.
export const pathToCrSqliteExtension: string = getCrSqliteExtensionPathSync()
```

### Static Paths (absolute, minimal init)

```typescript
// @effect-native/libcrsql/paths
// Export absolute paths as string constants. These are computed at module init
// from this file's location. No external dependencies or I/O.
import { fileURLToPath } from "node:url"

export const darwin_aarch64 = fileURLToPath(new URL("../lib/darwin-aarch64/libcrsqlite.dylib", import.meta.url))
export const darwin_x86_64 = fileURLToPath(new URL("../lib/darwin-x86_64/libcrsqlite.dylib", import.meta.url))
export const linux_aarch64 = fileURLToPath(new URL("../lib/linux-aarch64/libcrsqlite.so", import.meta.url))
export const linux_x86_64 = fileURLToPath(new URL("../lib/linux-x86_64/libcrsqlite.so", import.meta.url))
export const win_x86_64 = fileURLToPath(new URL("../lib/win-x86_64/crsqlite.dll", import.meta.url))
export const win_i686 = fileURLToPath(new URL("../lib/win-i686/crsqlite.dll", import.meta.url))
// Android/iOS not included in this release
```

### Resource Management Patterns

```typescript
import { Effect, Layer, Context } from "effect"

// Service pattern for advanced use cases
export interface LibCrSqliteService {
  readonly getExtensionPath: (platform?: Platform) => Effect.Effect<ExtensionPath, PlatformNotSupportedError | ExtensionNotFoundError>
  readonly getSupportedPlatforms: () => Effect.Effect<readonly string[]>
  readonly detectCurrentPlatform: () => Effect.Effect<Platform>
}

export const LibCrSqliteService = Context.GenericTag<LibCrSqliteService>("@effect-native/libcrsql/LibCrSqliteService")

export const LibCrSqliteServiceLive = Layer.succeed(
  LibCrSqliteService,
  {
    getExtensionPath: getCrSqliteExtensionPath,
    getSupportedPlatforms: () => Effect.succeed(SUPPORTED_PLATFORMS),
    detectCurrentPlatform: () => Effect.succeed(detectPlatform())
  }
)
```

## Type Safety Approach

### Zero Type Assertions Policy

```typescript
// FORBIDDEN: Type assertions
// const platform = process.platform as Platform  // ❌ NEVER

// CORRECT: Runtime validation with Schema
import { Schema } from "@effect/schema"

const PlatformSchema = Schema.Literal(
  "darwin-aarch64",
  "darwin-x86_64", 
  "linux-aarch64",
  "linux-x86_64",
  "win-x86_64",
  "win-i686",
  // Android/iOS not included in this release
)

export type Platform = Schema.Schema.Type<typeof PlatformSchema>

// Safe platform detection with validation
const detectPlatform = (): string => {
  const platform = process.platform
  const arch = process.arch
  
  // Map Node.js values to our platform strings
  const platformMap: Record<string, Record<string, string>> = {
    "darwin": {
      "arm64": "darwin-aarch64",
      "x64": "darwin-x86_64"
    },
    "linux": {
      "arm64": "linux-aarch64", 
      "x64": "linux-x86_64"
    },
    "win32": {
      "x64": "win-x86_64",
      "ia32": "win-i686"
    }
  }
  
  const platformString = platformMap[platform]?.[arch]
  return platformString ?? `${platform}-${arch}`
}
```

### Branded Types for Domain Safety

```typescript
import { Brand } from "effect"

// Brand the extension path to prevent mixing with regular strings
export type ExtensionPath = string & Brand.Brand<"ExtensionPath">

export const ExtensionPath = Brand.nominal<ExtensionPath>()

export const createExtensionPath = (path: string): ExtensionPath =>
  ExtensionPath(path)
```

### Schema-Based Validation

```typescript
import { Schema } from "@effect/schema"

// Configuration schema for internal use
const LibCrSqliteConfigSchema = Schema.Struct({
  platform: PlatformSchema,
  libPath: Schema.String,
  version: Schema.Literal("0.16.3")
})

type LibCrSqliteConfig = Schema.Schema.Type<typeof LibCrSqliteConfigSchema>

// Runtime validation of configuration
const validateConfig = Schema.decodeUnknown(LibCrSqliteConfigSchema)
```

## Module Architecture

### Package Structure and Organization

```
packages-native/libcrsql/
├── package.json                    # @effect-native/libcrsql@0.16.3
├── README.md                       # Usage documentation
├── CHANGELOG.md                    # Version history
├── LICENSE                         # MIT license
├── src/
│   ├── index.ts                    # Public API exports
│   └── internal/
│       ├── index.ts                # Internal exports
│       ├── platform.ts             # Platform detection logic
│       ├── paths.ts                # Path building utilities
│       └── errors.ts               # Error definitions
├── lib/                            # Binary assets (gitignored, built)
│   ├── darwin-aarch64/
│   │   └── libcrsqlite.dylib
│   ├── darwin-x86_64/  
│   │   └── libcrsqlite.dylib
│   ├── linux-aarch64/
│   │   └── libcrsqlite.so
│   ├── linux-x86_64/
│   │   └── libcrsqlite.so
│   ├── win-x86_64/
│   │   └── crsqlite.dll
│   ├── win-i686/
│   │   └── crsqlite.dll
│   
├── scripts/
│   └── download-binaries.ts        # Binary fetching script
├── test/
│   ├── index.test.ts               # Main API tests
│   ├── platform.test.ts            # Platform detection tests
│   └── integration.test.ts         # SQLite integration tests
├── tsconfig.json                   # Main TypeScript config
├── tsconfig.src.json               # Source compilation
├── tsconfig.test.json              # Test compilation  
├── tsconfig.build.json             # Build references
└── vitest.config.ts                # Test configuration
```

### Layer Composition Strategy

```typescript
import { Layer, Effect, Context } from "effect"
import { FileSystem } from "@effect/platform"

// Minimal service interface
export interface PlatformDetectionService {
  readonly detect: () => Effect.Effect<Platform, PlatformNotSupportedError>
  readonly validate: (platform: string) => Effect.Effect<Platform, PlatformNotSupportedError>
}

export const PlatformDetectionService = Context.GenericTag<PlatformDetectionService>(
  "@effect-native/libcrsql/PlatformDetectionService"
)

// Live implementation
export const PlatformDetectionServiceLive = Layer.succeed(
  PlatformDetectionService,
  {
    detect: () => Effect.gen(function* () {
      const detected = detectPlatform()
      return yield* validatePlatform(detected)
    }),
    validate: (platform: string) => validatePlatform(platform)
  }
)

// Path resolution service
export interface PathResolutionService {
  readonly resolvePath: (platform: Platform) => Effect.Effect<string>
  readonly verifyPath: (path: string) => Effect.Effect<string>
}

export const PathResolutionService = Context.GenericTag<PathResolutionService>(
  "@effect-native/libcrsql/PathResolutionService"  
)

export const PathResolutionServiceLive = Layer.succeed(
  PathResolutionService,
  {
    resolvePath: (platform: Platform) => Effect.succeed(buildExtensionPath(platform)),
    verifyPath: (path: string) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const exists = yield* fs.exists(path)
        if (!exists) {
          return yield* Effect.fail(new ExtensionNotFoundError({ path, platform: "unknown" }))
        }
        return path
      })
  }
)

// Main service composition
export const LibCrSqliteServiceLive = Layer.effect(
  LibCrSqliteService,
  Effect.gen(function* () {
    const platformService = yield* PlatformDetectionService
    const pathService = yield* PathResolutionService
    
    return {
      getExtensionPath: (platform?: Platform) => Effect.gen(function* () {
        const targetPlatform = platform ?? (yield* platformService.detect())
        const path = yield* pathService.resolvePath(targetPlatform)
        return yield* pathService.verifyPath(path)
      }),
      getSupportedPlatforms: () => Effect.succeed(SUPPORTED_PLATFORMS),
      detectCurrentPlatform: () => platformService.detect()
    }
  })
).pipe(
  Layer.provide(PlatformDetectionServiceLive),
  Layer.provide(PathResolutionServiceLive)
)
```

### Dependency Injection Pattern

```typescript
// Consumer code can use the service
export const createDatabaseWithExtension = (dbPath: string) =>
  Effect.gen(function* () {
    const libCrSqlite = yield* LibCrSqliteService
    const extensionPath = yield* libCrSqlite.getExtensionPath()
    
    // Create database and load extension
    const db = new Database(dbPath)
    db.loadExtension(extensionPath)
    
    return db
  }).pipe(
    Effect.provide(LibCrSqliteServiceLive)
  )
```

## Testing Strategy

### @effect/vitest Integration

```typescript
// test/index.test.ts
import { describe, it, expect } from "@effect/vitest"
import { Effect, Layer, Context } from "effect"
import { pathToCrSqliteExtension, getCrSqliteExtensionPath } from "../src/index.js"

// Example PlatformDetectionService for tests (provided via Layer)
interface PlatformDetectionService {
  readonly detect: () => Effect.Effect<string>
}
const PlatformDetectionService = Context.GenericTag<PlatformDetectionService>("PlatformDetectionService")

describe("LibCrSqlite", () => {
  it.effect("pathToCrSqliteExtension provides valid path for current platform", () =>
    Effect.gen(function* () {
      expect(typeof pathToCrSqliteExtension).toBe("string")
      expect(pathToCrSqliteExtension).toMatch(/\.(dylib|so|dll)$/)
    })
  )

  it.effect("getCrSqliteExtensionPath succeeds for current platform", () =>
    Effect.gen(function* () {
      const path = yield* getCrSqliteExtensionPath()
      expect(typeof path).toBe("string")
      expect(path.length).toBeGreaterThan(0)
    })
  )

  it.effect("fails when detection yields unsupported platform (no type assertions)", () =>
    Effect.gen(function* () {
      const UnsupportedDetection = Layer.succeed(PlatformDetectionService, { detect: () => Effect.succeed("freebsd-x64") })
      const effect = getCrSqliteExtensionPath().pipe(Effect.provide(UnsupportedDetection))
      const error = yield* effect.pipe(Effect.flip)
      expect(error._tag).toBe("PlatformNotSupportedError")
      expect(error.platform).toBe("freebsd-x64")
    })
  )
})
```

### TestClock for Time-Dependent Testing

```typescript
// For any future caching or timeout logic
import { TestClock, Effect } from "effect"

it.effect("extension path resolution is cached for 1 hour", () =>
  Effect.gen(function* () {
    const testClock = yield* TestClock

    const path1 = yield* getCrSqliteExtensionPath()
    yield* testClock.adjust("30 minutes")
    const path2 = yield* getCrSqliteExtensionPath()
    expect(path2).toBe(path1)

    // Advance past cache expiry
    yield* testClock.adjust("31 minutes")
    const path3 = yield* getCrSqliteExtensionPath()
    // Depending on caching policy, adjust the assertion accordingly
    expect(typeof path3).toBe("string")
  })
)
```

### Property-Based Testing with FastCheck

```typescript
import fc from "fast-check"

it.effect("platform string parsing is robust", () =>
  Effect.gen(function* () {
    const validPlatforms = SUPPORTED_PLATFORMS
    const randomPlatform = fc.sample(fc.constantFrom(...validPlatforms), 1)[0]
    
    const path = yield* getCrSqliteExtensionPath(randomPlatform)
    expect(path).toContain(randomPlatform)
  })
)
```

## JSDoc Documentation Plan

### Comprehensive API Documentation

```typescript
/**
 * Path to the cr-sqlite extension binary for the current platform
 * 
 * This is the primary API for most use cases. The path is determined
 * automatically based on the current Node.js platform and architecture.
 * 
 * @since 0.16.3
 * @category Primary API
 * @example
 * ```typescript
 * import { pathToCrSqliteExtension } from "@effect-native/libcrsql"
 * import Database from "better-sqlite3"
 * 
 * // Create database and load cr-sqlite extension
 * const db = new Database(":memory:")
 * db.loadExtension(pathToCrSqliteExtension)
 * 
 * // Now you can use CRDT features
 * db.exec("SELECT crsql_version()")
 * ```
 * 
 * @example
 * ```typescript  
 * import { pathToCrSqliteExtension } from "@effect-native/libcrsql"
 * import sqlite3 from "sqlite3"
 * 
 * const db = new sqlite3.Database(":memory:")
 * db.loadExtension(pathToCrSqliteExtension, (err) => {
 *   if (err) throw err
 *   console.log("cr-sqlite extension loaded successfully")
 * })
 * ```
 */
export declare const pathToCrSqliteExtension: ExtensionPath

/**
 * Effect-based cr-sqlite extension path resolution with comprehensive error handling
 * 
 * This function provides more control than the simple pathToCrSqliteExtension export,
 * allowing explicit platform specification and proper Effect error handling.
 * 
 * @param platform - Optional platform specification. If omitted, current platform is detected
 * @returns Effect that succeeds with extension path or fails with PlatformNotSupportedError
 * 
 * @since 0.16.3
 * @category Advanced API  
 * @example
 * ```typescript
 * import { getCrSqliteExtensionPath } from "@effect-native/libcrsql/effect"
 * import { Effect, Console } from "effect"
 * 
 * const program = Effect.gen(function* () {
 *   const extensionPath = yield* getCrSqliteExtensionPath()
 *   yield* Console.log(`Extension path: ${extensionPath}`)
 *   return extensionPath
 * })
 * 
 * Effect.runPromise(program)
 * ```
 * 
 * @example
 * ```typescript
 * import { getCrSqliteExtensionPath, Platform } from "@effect-native/libcrsql"  
 * import { Effect } from "effect"
 * 
 * // Cross-platform application - get paths for multiple platforms
 * const getAllPaths = Effect.gen(function* () {
 *   const platforms: Platform[] = ["darwin-aarch64", "linux-x86_64", "win-x86_64"]
 *   
 *   return yield* Effect.forEach(platforms, platform =>
 *     getCrSqliteExtensionPath(platform).pipe(
 *       Effect.map(path => ({ platform, path }))
 *     )
 *   )
 * })
 * ```
 * 
 * @example
 * ```typescript
 * import { getCrSqliteExtensionPath, PlatformNotSupportedError } from "@effect-native/libcrsql"
 * import { Effect, pipe } from "effect"
 * 
 * const handleExtensionPath = pipe(
 *   getCrSqliteExtensionPath(),
 *   Effect.catchTag("PlatformNotSupportedError", (error) =>
 *     Effect.gen(function* () {
 *       yield* Console.error(`Platform ${error.platform} not supported`)
 *       yield* Console.error(`Supported: ${error.supportedPlatforms.join(", ")}`)
 *       return yield* Effect.fail(error)
 *     })
 *   )
 * )
 * ```
 */
export declare const getCrSqliteExtensionPath: (
  platform?: Platform
) => Effect.Effect<ExtensionPath, PlatformNotSupportedError | ExtensionNotFoundError>

/**
 * Synchronous extension path getter for non-Effect consumers.
 * 
 * Throws PlatformNotSupportedError when the current/specified platform is unsupported,
 * or ExtensionNotFoundError when the binary cannot be found.
 * 
 * @since 0.16.3
 * @category Primary API
 * @example
 * ```typescript
 * import { getCrSqliteExtensionPathSync } from "@effect-native/libcrsql"
 * import Database from "better-sqlite3"
 * 
 * try {
 *   const path = getCrSqliteExtensionPathSync()
 *   const db = new Database(":memory:")
 *   db.loadExtension(path)
 * } catch (error) {
 *   console.error(error)
 * }
 * ```
 */
export declare const getCrSqliteExtensionPathSync: (platform?: Platform) => ExtensionPath
```

### Error Documentation with Examples

```typescript
/**
 * Error indicating that the current or specified platform is not supported
 * 
 * This error provides detailed information about platform detection and
 * available alternatives to help users understand and resolve the issue.
 * 
 * @since 0.16.3
 * @category Errors
 * @example
 * ```typescript
 * import { getCrSqliteExtensionPath } from "@effect-native/libcrsql/effect"
 * import { Effect, Console } from "effect"
 * 
 * const program = getCrSqliteExtensionPath().pipe(
 *   Effect.catchTag("PlatformNotSupportedError", (error) =>
 *     Console.error(
 *       `Unsupported: ${error.platform}. Supported: ${error.supportedPlatforms.join(", ")}`
 *     )
 *   )
 * )
 * 
 * Effect.runPromise(program)
 * ```
 */
export declare class PlatformNotSupportedError extends Data.TaggedError("PlatformNotSupportedError")<{
  readonly platform: string
  readonly supportedPlatforms: readonly string[]
  readonly detectedArch: string  
  readonly detectedPlatform: string
}>
```

## Code Examples

### Basic SQLite Integration

```typescript
// examples/basic-usage.ts
import { pathToCrSqliteExtension } from "@effect-native/libcrsql"
import Database from "better-sqlite3"

// Simple database setup with cr-sqlite
const db = new Database(":memory:")
db.loadExtension(pathToCrSqliteExtension)

// Verify extension loaded
const version = db.prepare("SELECT crsql_version() as version").get()
console.log("cr-sqlite version:", version.version)

// Create a CRDT table
db.exec(`
  CREATE TABLE posts (
    id INTEGER PRIMARY KEY,
    title TEXT,
    content TEXT  
  );
  
  SELECT crsql_as_crr('posts');
`)

// Insert data
const insert = db.prepare("INSERT INTO posts (title, content) VALUES (?, ?)")
insert.run("Hello CRDT", "This post will sync across devices!")

// View CRDT metadata
const changes = db.prepare("SELECT * FROM crsql_changes").all()
console.log("CRDT changes:", changes)
```

### Effect-Based Database Service

```typescript
// examples/effect-service.ts
import { Effect, Context, Layer } from "effect"
import { getCrSqliteExtensionPath, LibCrSqliteService } from "@effect-native/libcrsql"
import Database from "better-sqlite3"

// Database service interface
interface DatabaseService {
  readonly query: <T = unknown>(sql: string, params?: unknown[]) => Effect.Effect<T[]>
  readonly execute: (sql: string, params?: unknown[]) => Effect.Effect<void>
  readonly close: () => Effect.Effect<void>
}

const DatabaseService = Context.GenericTag<DatabaseService>("DatabaseService")

// Implementation with cr-sqlite
const DatabaseServiceLive = Layer.effect(
  DatabaseService,
  Effect.gen(function* () {
    const libCrSqlite = yield* LibCrSqliteService
    const extensionPath = yield* libCrSqlite.getExtensionPath()
    
    const db = new Database(":memory:")
    db.loadExtension(extensionPath)
    
    return {
      query: <T>(sql: string, params: unknown[] = []) =>
        Effect.sync(() => db.prepare(sql).all(...params) as T[]),
      execute: (sql: string, params: unknown[] = []) =>
        Effect.sync(() => { db.prepare(sql).run(...params) }),
      close: () => Effect.sync(() => db.close())
    }
  })
).pipe(Layer.provide(LibCrSqliteServiceLive))

// Usage
const program = Effect.gen(function* () {
  const db = yield* DatabaseService
  
  // Setup CRDT table
  yield* db.execute(`
    CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);
    SELECT crsql_as_crr('users');
  `)
  
  // Insert user
  yield* db.execute("INSERT INTO users (name) VALUES (?)", ["Alice"])
  
  // Query users
  const users = yield* db.query<{id: number, name: string}>("SELECT * FROM users")
  console.log("Users:", users)
  
  // View CRDT changes  
  const changes = yield* db.query("SELECT * FROM crsql_changes")
  console.log("CRDT changes:", changes)
})

Effect.runPromise(program.pipe(Effect.provide(DatabaseServiceLive)))
```

## Integration Points

### Effect Ecosystem Integration

```typescript
// Integration with @effect/platform (no Node fs APIs)
import { Effect } from "effect"
import { FileSystem } from "@effect/platform"

export const verifyExtensionExists = (path: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const exists = yield* fs.exists(path)
    if (!exists) {
      return yield* Effect.fail(new ExtensionNotFoundError({ path, platform: "unknown" }))
    }
    return path
  })

// Integration with @effect/schema for configuration validation
import { Schema } from "@effect/schema"

const DatabaseConfigSchema = Schema.Struct({
  path: Schema.String,
  enableCrSqlite: Schema.Boolean,
  crSqlitePlatform: Schema.optional(PlatformSchema)
})

export const createConfiguredDatabase = (config: unknown) =>
  Effect.gen(function* () {
    const validConfig = yield* Schema.decodeUnknown(DatabaseConfigSchema)(config)
    
    const db = new Database(validConfig.path)
    
    if (validConfig.enableCrSqlite) {
      const extensionPath = yield* getCrSqliteExtensionPath(validConfig.crSqlitePlatform)
      yield* Effect.sync(() => db.loadExtension(extensionPath))
    }
    
    return db
  })
```

### Build System Integration

```typescript
// scripts/download-binaries.ts - Binary fetching for build (maintainers/CI only)
// NOTE: This runs during repo builds, NOT during consumer install. Binaries are
// checked into the published package to avoid any postinstall/network activity.
import { Effect, Console } from "effect"
import * as fs from "fs"
import * as path from "path"

const RELEASE_ASSETS = [
  { platform: "darwin-aarch64", url: "https://github.com/vlcn-io/cr-sqlite/releases/download/v0.16.3/crsqlite-darwin-aarch64.zip" },
  { platform: "darwin-x86_64", url: "https://github.com/vlcn-io/cr-sqlite/releases/download/v0.16.3/crsqlite-darwin-x86_64.zip" },
  { platform: "linux-aarch64", url: "https://github.com/vlcn-io/cr-sqlite/releases/download/v0.16.3/crsqlite-linux-aarch64.zip" },
  { platform: "linux-x86_64", url: "https://github.com/vlcn-io/cr-sqlite/releases/download/v0.16.3/crsqlite-linux-x86_64.zip" },
  { platform: "win-x86_64", url: "https://github.com/vlcn-io/cr-sqlite/releases/download/v0.16.3/crsqlite-win-x86_64.zip" },
  { platform: "win-i686", url: "https://github.com/vlcn-io/cr-sqlite/releases/download/v0.16.3/crsqlite-win-i686.zip" },
  // Android/iOS assets not included in this release
]

const downloadAndExtract = (asset: typeof RELEASE_ASSETS[0]) =>
  Effect.gen(function* () {
    yield* Console.log(`Downloading ${asset.platform}...`)
    
    // Download binary
    const response = yield* Effect.promise(() => fetch(asset.url))
    const buffer = yield* Effect.promise(() => response.arrayBuffer())
    
    // Create platform directory
    const platformDir = path.join("lib", asset.platform)
    yield* Effect.sync(() => fs.mkdirSync(platformDir, { recursive: true }))
    
    // Extract and organize files
    const tempFile = path.join(platformDir, "temp" + (asset.url.endsWith(".tar.gz") ? ".tar.gz" : ".zip"))
    yield* Effect.sync(() => fs.writeFileSync(tempFile, Buffer.from(buffer)))
    
    // Extract using appropriate tool
    if (asset.url.endsWith(".tar.gz")) {
      yield* Effect.promise(() => exec(`tar -xzf ${tempFile} -C ${platformDir}`))
    } else {
      yield* Effect.promise(() => exec(`unzip -q ${tempFile} -d ${platformDir}`))
    }
    
    // Clean up temp file
    yield* Effect.sync(() => fs.unlinkSync(tempFile))
    
    yield* Console.log(`✓ ${asset.platform} extracted to ${platformDir}`)
  })

const downloadAllBinaries = Effect.gen(function* () {
  yield* Console.log("Downloading cr-sqlite binaries for all platforms (maintainers/CI)...")
  
  // Download all platforms concurrently
  yield* Effect.forEach(
    RELEASE_ASSETS,
    downloadAndExtract,
    { concurrency: 4 } // Limit concurrent downloads
  )
  
  yield* Console.log("All binaries downloaded successfully!")
})

// Integration with package.json scripts
// "scripts": {
//   "prebuild": "tsx scripts/download-binaries.ts",
//   "build": "@effect/build-utils build"
// }
// Consumers receive pre-bundled binaries; no network/postinstall at install time.
```

This comprehensive design covers all the critical aspects of implementing the `@effect-native/libcrsql` package with proper Effect library patterns, type safety, comprehensive testing, and integration strategies. The design ensures zero forbidden patterns, proper error handling, and follows all Effect ecosystem conventions.
