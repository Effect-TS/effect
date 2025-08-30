# Plan: @effect-native/libsqlite (Phase 4)

## 5-Phase Structure
- [x] Phase 1: Instructions
- [x] Phase 2: Requirements
- [x] Phase 3: Design
- [ ] Phase 4: Plan (this document)
- [ ] Phase 5: Implementation

## Objectives
- Deliver a zero-runtime-deps package that exposes the path to a version-pinned `libsqlite3` across macOS and Linux glibc (arm64/x64), with idiomatic Effect integration as an optional subpath.
- Build `libsqlite3` via the root Nix flake, assemble platform folders into `packages-native/libsqlite/lib/<platform>/`, and publish via the existing release workflow.

## Task Hierarchy

1) Package scaffolding
- Create `packages-native/libsqlite/` with standard Effect package structure
- Add `package.json` (`@effect-native/libsqlite`), `exports` for `.`, `./paths`, `./effect`
- Add tsconfigs (`tsconfig.json`, `tsconfig.src.json`, `tsconfig.test.json`, `tsconfig.build.json`)
- Add source files: `src/index.ts`, `src/paths.ts`, `src/effect.ts`
- Add `README.md` with usage examples (Node, Bun, Effect)
- Add `test/` with unit tests; add `vitest` config if needed
- Add changeset entry

2) Runtime detection + APIs
- Implement platform detection (darwin arm64/x64; linux glibc arm64/x64)
- Implement `pathToLibSqlite` and `getLibSqlitePathSync()` (sync, string)
- Implement `/paths` static absolute strings (no logic)
- Implement `/effect` Tag/Layer and `getLibSqlitePath` Effect
- Friendly unsupported platform errors (“if you’d like support…” + supported list)

3) Nix build + artifact assembly
- Add `nix/libsqlite3.nix` derivation enabling loadable extensions
- Expose `packages.${system}.libsqlite3` from root `flake.nix`
- Extend `release.yml`:
  - Install Nix; build darwin+linux variants
  - Upload artifacts per platform
  - Assemble into `packages-native/libsqlite/lib/<platform>/`
  - Run `pnpm build` and `changesets` publish

4) Documentation & JSDoc
- 100% JSDoc coverage with `@since`, `@example`, optional `@category`
- Examples for Node, Bun, and Effect
- Update repo docs if needed; ensure `pnpm docgen` passes

5) Tests
- Unit: detection matrix via indirection/mocks; static paths import shape
- Error: musl and unsupported platforms messages
- Effect: `getLibSqlitePath` happy path + error mapping
- Keep tests hermetic (no real dlopen); optionally add example snippet in README

6) Packaging polish
- Ensure `files` in `package.json` includes `dist/` and `lib/` only (plus README, LICENSE)
- Verify tarball size; no extraneous files
- Add license/NOTICE metadata for SQLite and nixpkgs

## Validation Checkpoints (run iteratively)
- Lint: `pnpm lint --fix packages-native/libsqlite`
- Docgen: `pnpm docgen`
- Types: `pnpm check`
- Tests: `pnpm test packages-native/libsqlite`
- Build: `pnpm build`

## Risk Mitigation
- Platform drift: pin nixpkgs in `flake.lock`; record nixpkgs rev + SQLite version in `lib/metadata.json`
- Musl confusion: clear, friendly error text; document scope; invite requests
- ESM path resolution: use `new URL(..., import.meta.url)` to avoid cwd issues
- Binary mismatch: CI assembles binaries only from the Nix build for the declared SQLite version
- CI complexity: extend existing `release.yml` rather than a new workflow; cache Nix store via actions cache if needed
- Size creep: restrict `files` in `package.json`; exclude dev artifacts
- Effect isolation: `/effect` behind optional peer; root and `/paths` have zero deps

## Success Criteria Validation
- Root and `/paths` import work with zero deps; strings are absolute
- Effect API composes in Effects; error type is `PlatformNotSupportedError` with helpful `help` message
- `pnpm lint`, `pnpm check`, `pnpm docgen`, `pnpm test`, `pnpm build` all pass
- Release pipeline builds and publishes tarball containing correct binaries for the npm version (SQLite version)

## Progress Tracking
- Use this checklist to track completion:
  - [ ] Scaffolding created
  - [ ] Root API implemented
  - [ ] `/paths` implemented
  - [ ] `/effect` implemented
  - [ ] Nix derivation added
  - [ ] Flake outputs wired
  - [ ] Release workflow extended
  - [ ] Tests added and passing
  - [ ] Docgen examples added and passing
  - [ ] Package files filtered; metadata/licenses included
  - [ ] Changeset written

Notes
- We are deferring Linux musl and Windows; errors explicitly invite users to ask for support if they’d like those platforms.
