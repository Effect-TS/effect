# Design: @effect-native/libsqlite

This document describes the architecture and implementation plan for a universal, version‑pinned SQLite dynamic library package that aligns with `@effect-native/libcrsql` decisions and Effect library standards.

## Effect Library Patterns

- Generator style where appropriate with `Effect.gen`, using `return yield*` for error or interrupt propagation.
- No `try-catch` inside `Effect.gen`; use `Effect.mapError`, `Effect.catchTag`, or typed errors.
- Resource semantics are minimal here (no long‑lived resources), but the Effect entrypoint exposes a Tag/Layer for composability.

## Type Safety Approach

- No `any`/`unknown` assertions; avoid type assertions entirely.
- Define a precise `Platform` union covering only supported targets:
  - `"darwin-aarch64" | "darwin-x86_64" | "linux-x86_64" | "linux-aarch64"`
- Branded error type for platform mismatches.

## Module Architecture

- Package structure (TS sources):
  - `src/index.ts`: Root, zero‑deps, auto‑detects and exports `pathToLibSqlite` (string) and `getLibSqlitePathSync(platform?: Platform)`.
  - `src/paths.ts`: Static absolute strings only (no logic). Exports `darwin_aarch64`, `darwin_x86_64`, `linux_x86_64`, `linux_aarch64`.
  - `src/effect.ts`: Optional Effect entrypoint with Tag/Layer and `getLibSqlitePath` as `Effect.Effect<string, PlatformNotSupportedError>`.
- Compiled outputs referenced in `package.json` `exports`:
  - `".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" }
  - "./paths": { "types": "./dist/paths.d.ts", "import": "./dist/paths.js" }
  - "./effect": { "types": "./dist/effect.d.ts", "import": "./dist/effect.js" }
- Binaries placed under `lib/<platform>/`:
  - `lib/darwin-aarch64/libsqlite3.dylib`
  - `lib/darwin-x86_64/libsqlite3.dylib`
  - `lib/linux-x86_64/libsqlite3.so`
  - `lib/linux-aarch64/libsqlite3.so`

## Error Handling Strategy

- Define `PlatformNotSupportedError` using `Data.TaggedError` with fields `{ platform: string; help: string }`.
- Root sync API throws a regular `Error` for unsupported platforms to keep zero‑deps ergonomics; Effect API maps to `PlatformNotSupportedError`.
- Message tone and content: explicitly invite users to request additional platform support (we want to support platforms you care about) and list currently supported targets to avoid confusion.
- Musl handling: If `process.platform === "linux"` and best‑effort detection suggests musl, report a clear, friendly error stating musl is deferred and inviting users to request support.

## Runtime Detection Design

- Inputs: `process.platform`, `process.arch`.
- Linux glibc vs musl detection (best‑effort, zero deps):
  - If `typeof process.report?.getReport === "function"`, inspect `process.report().header.glibcVersionRuntime`. Presence → assume glibc.
  - If missing, optionally scan `process.report().sharedObjects` for `musl` substring; if found → error.
  - Otherwise, default to glibc (documented behavior) but allow an env opt‑out in future versions.
- Selected platform is mapped to a static absolute path under `lib/<platform>/`.

## Testing Strategy

- Use `@effect/vitest` and `it.effect` for Effect entrypoint tests.
- Unit tests for root entry and `/paths` using plain vitest assert style:
  - Platform matrix via environment injection/mocking of `process.platform` and `process.arch` (implemented through indirection helper to avoid global mutation in tests).
  - Assert that returned path exists and is absolute (in CI we may stub the filesystem path when artifacts are not present yet).
- Error tests: simulate musl detection to ensure the error surfaces with a helpful message.
- Docgen: Provide compilable examples for all public exports.
- Time‑dependent behavior is not relevant; `TestClock` is not required here.

## JSDoc Documentation Plan

- 100% JSDoc coverage for public APIs with `@since`, `@example`, and optional `@category`.
- Examples include Node and Bun usage, plus Effect examples using `Effect.gen` and `return yield*`.
- Examples compile under `pnpm docgen`.

## Code Examples (Illustrative)

### `src/paths.ts` (no logic, string constants)
```ts
/** @since 3.50.2 */
/** @category Paths */
export const darwin_aarch64 = new URL("../lib/darwin-aarch64/libsqlite3.dylib", import.meta.url).pathname
/** @category Paths */
export const darwin_x86_64 = new URL("../lib/darwin-x86_64/libsqlite3.dylib", import.meta.url).pathname
/** @category Paths */
export const linux_x86_64 = new URL("../lib/linux-x86_64/libsqlite3.so", import.meta.url).pathname
/** @category Paths */
export const linux_aarch64 = new URL("../lib/linux-aarch64/libsqlite3.so", import.meta.url).pathname
```

### `src/index.ts` (root, zero deps)
```ts
export type Platform = "darwin-aarch64" | "darwin-x86_64" | "linux-x86_64" | "linux-aarch64"

const paths = {
  "darwin-aarch64": new URL("../lib/darwin-aarch64/libsqlite3.dylib", import.meta.url).pathname,
  "darwin-x86_64": new URL("../lib/darwin-x86_64/libsqlite3.dylib", import.meta.url).pathname,
  "linux-x86_64": new URL("../lib/linux-x86_64/libsqlite3.so", import.meta.url).pathname,
  "linux-aarch64": new URL("../lib/linux-aarch64/libsqlite3.so", import.meta.url).pathname
} as const

function detect(): Platform {
  const p = process.platform
  const a = process.arch
  if (p === "darwin" && a === "arm64") return "darwin-aarch64"
  if (p === "darwin" && a === "x64") return "darwin-x86_64"
  if (p === "linux" && a === "x64") {
    const glibc = (process as any).report?.getReport?.()?.header?.glibcVersionRuntime
    if (glibc) return "linux-x86_64"
    const shared = (process as any).report?.getReport?.()?.sharedObjects
    if (Array.isArray(shared) && shared.some((x: unknown) => typeof x === "string" && x.includes("musl"))) {
      throw new Error([
        "Linux musl detected; v1 supports glibc only.",
        "If you'd like musl support, please open an issue and we'll prioritize it.",
        "We actively want to support platforms you care about."
      ].join(" "))
    }
    return "linux-x86_64"
  }
  if (p === "linux" && a === "arm64") {
    const glibc = (process as any).report?.getReport?.()?.header?.glibcVersionRuntime
    if (glibc) return "linux-aarch64"
    const shared = (process as any).report?.getReport?.()?.sharedObjects
    if (Array.isArray(shared) && shared.some((x: unknown) => typeof x === "string" && x.includes("musl"))) {
      throw new Error([
        "Linux musl detected; v1 supports glibc only.",
        "If you'd like musl support, please open an issue and we'll prioritize it.",
        "We actively want to support platforms you care about."
      ].join(" "))
    }
    return "linux-aarch64"
  }
  throw new Error([
    `Unsupported platform: ${p}-${a}.`,
    "Supported: darwin-aarch64, darwin-x86_64, linux-x86_64 (glibc), linux-aarch64 (glibc).",
    "If you'd like support for this platform, please open an issue and we'll prioritize it.",
    "We aim to support platforms you actually use."
  ].join(" "))
}

/** Auto-detected absolute path */
export const pathToLibSqlite = paths[detect()]

/** Sync API with explicit platform */
export function getLibSqlitePathSync(platform?: Platform): string {
  return platform ? paths[platform] : pathToLibSqlite
}
```

### `src/effect.ts` (Effect entrypoint)
```ts
import * as Effect from "effect/Effect"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import { getLibSqlitePathSync } from "./index.js"

export class PlatformNotSupportedError extends Data.TaggedError("PlatformNotSupportedError")<{
  readonly platform: string
  readonly help: string
}> {}

export interface LibSqliteService {
  readonly path: string
}

export const LibSqlite = Context.Tag<LibSqliteService>()

export const LibSqliteLive = Effect.succeed(LibSqlite, { path: getLibSqlitePathSync() })

export const getLibSqlitePath: Effect.Effect<string, PlatformNotSupportedError> = Effect.try({
  try: () => getLibSqlitePathSync(),
  catch: (e) => new PlatformNotSupportedError({
    platform: process.platform + "-" + process.arch,
    help: [
      "Unsupported platform detected.",
      "Supported: darwin-aarch64, darwin-x86_64, linux-x86_64 (glibc), linux-aarch64 (glibc).",
      "If you'd like support for this platform, please open an issue and we'll prioritize it."
    ].join(" ")
  })
})
```

Notes:
- Effect code uses `Effect.try` rather than `try/catch` in generators, preserving Effect error semantics.
- No type assertions are used; tags and interfaces are precise.

## Integration Points

- Nix integration
  - Single root `flake.nix` drives builds; `nix/libsqlite3.nix` implements derivation.
  - Outputs: `packages.${system}.libsqlite3`. Ensure `-DSQLITE_ENABLE_LOAD_EXTENSION=1`.
  - CI release workflow (extend `release.yml`) builds darwin/linux glibc variants and assembles `lib/<platform>/` into the npm package before `changesets` publish.
- Effect ecosystem
  - Optional Effect subpath allows providing the path via Layer; non‑Effect users are unaffected.
- SQLite ecosystem
  - Returned path integrates with `better-sqlite3`, `sqlite3`, Bun, or any consumer of a `.dylib`/`.so` path.

## Security and Footprint

- No network or execution at install time; no postinstall scripts.
- Root and `/paths` have zero external runtime dependencies.
- Ship only required binaries, types, code, and licenses.

## Open Trade-offs

- Musl detection is best‑effort; we explicitly defer musl builds in v1 and error when detected.
- Deep per‑platform subpath modules (e.g., `paths/linux-x86_64`) could be added if we see demand for even smaller import surfaces, but `/paths` with no logic already meets “no side effects” and tree‑shakeability needs.
