# @effect-native/libsqlite

## 3.50.201

### Patch Changes

- [#73](https://github.com/effect-native/effect-native/pull/73) [`6dbea70`](https://github.com/effect-native/effect-native/commit/6dbea705cc0cbb0aad92e60785a8179bd8555434) Thanks @subtleGradient! - Release summary:
  - Unify SQLite 3.50.2 across macOS (arm64/x86_64) and Linux (glibc x86_64/aarch64) with prebuilt dylib/so binaries.
  - Add per-platform metadata (metadata.json) including nixpkgs rev, sha256, sqliteVersion, and arch; assert mac arm64/x86_64 are distinct.
  - Zero runtime dependencies; simple root/paths API; optional Effect subpath with Layer.sync and typed error.
  - Friendly, inclusive errors for unsupported platforms (invite requests; list supported targets).
  - Tests with @effect/vitest for error mapping and explicit platform paths; JSDoc examples added for all path constants.
  - Nix flake outputs with loadable extensions enabled; helper scripts to prebuild and regenerate metadata.
