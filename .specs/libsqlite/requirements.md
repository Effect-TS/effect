# Requirements: @effect-native/libsqlite

This document formalizes the requirements for a universal, version‑pinned SQLite dynamic library bundle distributed as `@effect-native/libsqlite`. It aligns with the decisions made for `@effect-native/libcrsql` where applicable.

## FR1 – Functional Requirements

- FR1.1: Root API provides an auto‑detected absolute path to `libsqlite3` as a string via `pathToLibSqlite`.
- FR1.2: Root API provides `getLibSqlitePathSync(platform?: Platform): string` to select a specific platform explicitly.
- FR1.3: Static paths subpath `@effect-native/libsqlite/paths` exports absolute string constants for each supported platform with zero code execution.
- FR1.4: Effect subpath `@effect-native/libsqlite/effect` provides an idiomatic Effect API returning an `Effect.Effect<string, PlatformNotSupportedError>` and a Tag/Layer that exposes the resolved path.
- FR1.5: Package version equals the bundled SQLite version (e.g., `3.50.2`). JS‑only fixes use a hyphenated suffix (e.g., `3.50.2-1`) without changing the SQLite version.
- FR1.6: Supported platforms (v1):
  - FR1.6.1: macOS darwin‑aarch64 (Apple Silicon)
  - FR1.6.2: macOS darwin‑x86_64 (Intel)
  - FR1.6.3: Linux linux‑x86_64 (glibc)
  - FR1.6.4: Linux linux‑aarch64 (glibc)
- FR1.7: Unsupported platforms (e.g., Linux musl, Windows) produce a clear, actionable error at runtime (root API) and are not exported in `/paths`.
- FR1.8: Returned paths work with standard SQLite bindings that accept a library path (e.g., Node `dlopen`, better‑sqlite3, node‑sqlite3, Bun SQLite).
- FR1.9: No postinstall scripts, no dynamic downloads, no native compilation at install or runtime.
- FR1.10: Binaries are bundled inside the npm tarball; no network is required after installation.

## NFR2 – Non‑Functional Requirements

- NFR2.1: Zero external runtime dependencies for root entry and `/paths` subpath.
- NFR2.2: Importing root or `/paths` modules performs no side effects beyond computing or returning strings.
- NFR2.3: Deterministic builds; pinned nixpkgs input drives reproducible library outputs.
- NFR2.4: Minimal install footprint; only required binaries and metadata are included.
- NFR2.5: ESM‑first package with type definitions; Node.js ≥ 18 and Bun (latest stable) supported.
- NFR2.6: Clear, friendly error messages for unsupported platforms (e.g., musl), explicitly inviting users to request support if they'd like those platforms supported, and listing currently supported targets to avoid confusion.
- NFR2.7: Security: no code execution beyond path computation; no environment mutation; no shelling out.

## TC3 – Technical Constraints

- TC3.1: Build via a single root `flake.nix`; implement a shared derivation (e.g., `nix/libsqlite3.nix`).
- TC3.2: Derivation compiles `libsqlite3` with extension loading enabled (e.g., `-DSQLITE_ENABLE_LOAD_EXTENSION=1`).
- TC3.3: No per‑package flake in v1; may add a thin wrapper later if external consumption as a flake becomes a requirement.
- TC3.4: Directory layout for bundled artifacts aligns with libcrsql:
  - `packages-native/libsqlite/lib/darwin-aarch64/libsqlite3.dylib`
  - `packages-native/libsqlite/lib/darwin-x86_64/libsqlite3.dylib`
  - `packages-native/libsqlite/lib/linux-x86_64/libsqlite3.so`
  - `packages-native/libsqlite/lib/linux-aarch64/libsqlite3.so`
- TC3.5: Public API and exports:
  - Root: `pathToLibSqlite`, `getLibSqlitePathSync()`
  - Subpaths: `@effect-native/libsqlite/paths`, `@effect-native/libsqlite/effect`
  - `package.json` `exports` maps subpaths to files; `files` includes `lib/` and built outputs.
- TC3.6: Runtime detection uses only Node/Bun built‑ins (e.g., `process.platform`, `process.arch`). For Linux, assume glibc in v1; detect musl and throw an error.
- TC3.7: ESM only; no CommonJS entry is required.

## DR4 – Data Requirements

- DR4.1: Bundled binaries are placed under `packages-native/libsqlite/lib/<platform>/` exactly as specified in TC3.4.
- DR4.2: Metadata:
  - DR4.2.1: Record SQLite version and nixpkgs commit in a machine‑readable file (e.g., `lib/metadata.json`).
  - DR4.2.2: Include LICENSE/NOTICE files for SQLite and nixpkgs as required.
  - DR4.2.3: Preserve correct file permissions for shared libraries.
- DR4.3: Type definitions included for all public APIs; `Platform` union type includes only supported values.
- DR4.3.1: `PlatformNotSupportedError` includes `{ platform: string; help: string }` with a friendly message inviting users to request support ("if you'd like").
- DR4.4: JSDoc coverage is 100% for public APIs with compilable `@example` blocks.
- DR4.5: Package includes `README.md` with examples for Node and Bun.

## IR5 – Integration Requirements

- IR5.1: SQLite client compatibility:
  - IR5.1.1: Paths work with `better-sqlite3` via `loadExtension()` where supported.
  - IR5.1.2: Paths work with `sqlite3` (node-sqlite3) `loadExtension()` where supported.
  - IR5.1.3: Paths are usable in Bun (e.g., with `bun:sqlite`).
- IR5.2: Effect integration:
  - IR5.2.1: Provide `getLibSqlitePath: Effect.Effect<string, PlatformNotSupportedError>`.
  - IR5.2.2: Provide Tag/Layer offering `pathToLibSqlite` for DI.
  - IR5.2.3: Effect APIs are isolated to the `/effect` subpath so non‑Effect users do not install or import `effect`.
- IR5.3: Monorepo/build integration:
  - IR5.3.1: Package builds with `@effect/build-utils` and standard tsconfigs.
  - IR5.3.2: Works with existing `changesets` release tooling.
- IR5.4: CI integration (release pipeline):
  - IR5.4.1: Extend `release.yml` to build libsqlite3 via Nix for `darwin` and `linux` targets.
  - IR5.4.2: Upload built artifacts as workflow artifacts per platform.
  - IR5.4.3: A package‑assembly step copies artifacts into `packages-native/libsqlite/lib/<platform>/` before `changesets` publish.
  - IR5.4.4: No separate workflow required; extend the existing release workflow.

## DEP6 – Dependencies

- DEP6.1 Runtime:
  - DEP6.1.1: Root entry and `/paths` have zero external runtime dependencies.
  - DEP6.1.2: `/effect` depends on `effect` (peer) and may use `@effect/data` types via `effect` (no hard runtime dep for root/paths).
- DEP6.2 Development:
  - DEP6.2.1: `@effect/build-utils` for bundling.
  - DEP6.2.2: `@effect/vitest` for tests.
  - DEP6.2.3: `@effect/docgen` for documentation generation.
  - DEP6.2.4: Standard repository dev tooling (eslint, typescript).
- DEP6.3 External:
  - DEP6.3.1: `nixpkgs-unstable` for building libsqlite3.
  - DEP6.3.2: Node/Bun built‑ins for detection.

## SC7 – Success Criteria

- SC7.1: `pnpm build`, `pnpm check`, `pnpm lint`, and `pnpm docgen` pass with zero errors.
- SC7.2: Unit tests cover environment detection, path resolution, and error conditions (musl and unknown platforms).
- SC7.3: `/paths` exports are absolute paths and import with zero side effects.
- SC7.4: Root API returns a valid existing path on all supported platforms; throws a clear error on unsupported ones.
- SC7.4.1: Error text for unsupported platforms includes an invitation to request support (phrased as "want"/"if you'd like") and lists currently supported platforms.
- SC7.5: npm package contains only the required files (code, types, `lib/` binaries, metadata, licenses).
- SC7.6: Release workflow builds and publishes an npm tarball that includes the correct binaries for the declared SQLite version.
- SC7.7: Documentation includes examples for Node and Bun; Effect examples compile under docgen.
