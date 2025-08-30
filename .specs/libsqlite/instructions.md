# @effect-native/libsqlite — Phase 1 Instructions

## Overview

Universal, prebuilt libsqlite3 dynamic library bundle (Pure-Nix) that Just Works™ across supported desktop/server platforms. The package ships fresh `libsqlite3` binaries built from `nixpkgs-unstable`, auto-detects the host environment at runtime, and returns the correct `.dylib`/`.so` path for reliable extension loading in environments where the system SQLite is missing features or cannot load extensions.

- Package name: `@effect-native/libsqlite`
- Primary value: Reliable, version-pinned SQLite runtime for loading extensions
- Versioning: NPM package version matches the SQLite version (e.g., `3.50.2`), with optional JS-only patch suffix `-N` (e.g., `3.50.2-1`) that does not change the bundled SQLite version
- Example install: `bun add @effect-native/libsqlite@3.50`

## Personas & User Stories

1) Typical Node.js developer — “Just give me the path”
- As a Node/Bun developer who doesn’t care about native details, I want a simple API that returns the absolute path to `libsqlite3` as a string, so I can pass it to `dlopen` or my SQLite binding without any extra setup.

2) 31337 power user — “Deep import, zero overhead”
- As an advanced user who knows the exact platform/arch I need, I want a deep import that exports a static string path to the specific binary without executing any detection logic or importing anything else.

3) Effect‑pilled developer — “Idiomatic Effect integration”
- As an Effect user, I want an idiomatic Effect service/Layer that provides the resolved path and integrates cleanly with my Effect application without mixing Promise APIs or imperative globals.

## Core Requirements

- Provide prebuilt `libsqlite3` binaries for major desktop/server targets:
  - Darwin: `aarch64` (Apple Silicon) and `x86_64`
  - Linux: `x86_64` and `aarch64` with glibc (musl deferred)
- Runtime environment detection and path resolution:
  - Detect OS and architecture; on Linux, assume glibc in v1. If musl is detected, the API returns a descriptive error indicating musl support is deferred.
  - Expose a single JS/TS API to return the absolute path to the bundled `libsqlite3`
- Static paths subpath for power users (no code execution):
  - `@effect-native/libsqlite/paths` exporting per-platform absolute strings with no side effects
- Version mapping:
  - NPM version equals the SQLite version; optional `-N` suffix for JS-only patches
  - Ensure binary artifacts correspond exactly to the declared SQLite version
- Documentation and DX:
  - Clear usage docs and examples (Node.js and Bun)
  - JSDoc coverage for public API with compilable examples
- Compliance and metadata:
  - Include appropriate licenses/NOTICE for SQLite and nixpkgs artifacts
  - Publishable as ESM; type-checked via repository standards
  
### Dependency Minimization
- Zero runtime dependencies in `dependencies` (hard requirement)
- No `postinstall` scripts; no dynamic downloads or optional native builds
- Effect integration provided via optional peer dependency `effect` and isolated subpath export (`@effect-native/libsqlite/effect`) so non-Effect users don’t install or import it
- Use only Node/Bun built-ins for detection (`process`, `os`); ship small, side‑effect‑free modules

## Technical Specifications

- Build source: `nixpkgs-unstable` (via the repo’s existing `flake.nix`) produces `libsqlite3` for each target
- Binary layout in package (illustrative; aligned with libcrsql):
  - `lib/darwin-aarch64/libsqlite3.dylib`
  - `lib/darwin-x86_64/libsqlite3.dylib`
  - `lib/linux-x86_64/libsqlite3.so`
  - `lib/linux-aarch64/libsqlite3.so`
  - musl variants deferred to a future release
- Runtime selection logic:
  - Detect via `process.platform`, `process.arch`, and glibc/musl sniffing (e.g. `process.report.getReport()`, `/lib/libc.musl-` presence, or other portable checks)
  - Export `getLibSqlitePathSync(): string` and `pathToLibSqlite` constant for convenience
  - Provide static subpath `@effect-native/libsqlite/paths` that only exports strings (no imports/side effects)
- Compatibility targets:
  - Node.js ≥ 18, Bun ≥ latest stable
  - ESM-first package with generated `.d.ts`
- No dynamic fetching at runtime; binaries are bundled in the npm tarball

### Public API Surface (v1)
- Root (zero runtime deps):
  - `export const pathToLibSqlite: string` // auto-detected absolute path
  - `export function getLibSqlitePathSync(platform?: Platform): string`
- Static paths subpath (string-only exports, no logic): `@effect-native/libsqlite/paths`
  - `export const darwin_aarch64: string`
  - `export const darwin_x86_64: string`
  - `export const linux_x86_64: string`
  - `export const linux_aarch64: string`
- Effect subpath (optional, isolated): `@effect-native/libsqlite/effect`
  - `export const getLibSqlitePath: Effect.Effect<string, PlatformNotSupportedError>`
  - Tag/Layer that provides `pathToLibSqlite`

### Types and Errors
- `export type Platform = "darwin-aarch64" | "darwin-x86_64" | "linux-x86_64" | "linux-aarch64"`
- `export class PlatformNotSupportedError extends Data.TaggedError("PlatformNotSupportedError")<{ readonly platform: string }>`

### Nix Build Integration
- Single root `flake.nix` drives builds; expose `packages.${system}.libsqlite3`
- Derivation implemented in a shared module (e.g., `nix/libsqlite3.nix`) and imported by root flake
- No per-package flake in v1; consider thin wrapper later if external flake consumption is requested

## Acceptance Criteria

- Installing `@effect-native/libsqlite@3.50.x` yields a package whose bundled libsqlite3 is exactly SQLite `3.50.x`
- Calling `getLibSqlitePathSync()` returns an existing absolute path to the correct binary on:
  - macOS arm64 and x64
  - Linux x64 glibc and arm64 glibc
- Example projects (Node and Bun) can successfully `dlopen` a simple test extension using the provided path (documented, not necessarily executed in CI)
- Full repository validations pass: lint, typecheck, docgen, tests, build
- JSDoc examples compile via `pnpm docgen`
- Dependency footprint:
  - `dependencies` is empty
  - No install scripts
  - Effect integration isolated behind an optional peer dependency and subpath export
 - `@effect-native/libsqlite/paths` exports absolute strings with zero side effects

## Out of Scope (v1)

- Windows `.dll` support
- Mobile platforms (iOS/Android)
- Automatic selection of system SQLite or fallback; v1 always uses bundled binaries (env opt-out may be considered later)
- Shipping third-party SQLite extensions; only the core `libsqlite3` is bundled
 - Any `postinstall`-time build/download steps
 - Linux musl variants

## Success Metrics

- 0 docgen/typecheck/lint/build errors in CI
- ≥ 95% successful environment detection in supported targets (validated via tests and local/CI matrices)
- Clear mapping of npm version → SQLite version with no mismatches
- Positive DX (copy-paste example works across Node and Bun)
- Minimal install size and zero runtime dependencies

## Future Considerations

- Add Windows `.dll` coverage
- Add musl Linux variants if not included in v1
- Provide an Effect Layer that exposes the resolved path via Context/Layer
- Publish additional channels tracking upstream SQLite releases automatically
- Optional environment variables to prefer system SQLite or force a specific variant

## Testing Requirements

- Unit tests: environment detection matrix (platform, arch, libc detection) and path resolution
- Property tests: version parsing and npm-version ↔ SQLite-version mapping
- Integration tests (where feasible): attempt `dlopen` of the resolved path (skipped in unsupported CI runners)
- Docgen validation: examples compile and typecheck
- Repository-wide checks: `pnpm lint`, `pnpm check`, `pnpm build` and targeted `pnpm test`
