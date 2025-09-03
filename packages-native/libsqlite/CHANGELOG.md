# @effect-native/libsqlite

## 3.50.202

### Patch Changes

- [#84](https://github.com/effect-native/effect-native/pull/84) [`c9b303a`](https://github.com/effect-native/effect-native/commit/c9b303a3cc23f34eb10fdaa80e217475046edb55) Thanks @subtleGradient! - README example how to embed and use libsqlite and crsqlite in a compiled Bun single file executable

- [#87](https://github.com/effect-native/effect-native/pull/87) [`ddac582`](https://github.com/effect-native/effect-native/commit/ddac5829f4280305092dd552f99e0d691ad25399) Thanks @subtleGradient! - Add prepublish verification for the `./effect` subpath artifacts.
  - Introduce `scripts/verify-exports.mjs` that checks `dist/dist/{esm,cjs,dts}/effect.*` and attempts an ESM import.
  - Wire `prepublishOnly` to build + verify and whitelist the script in `files`.
  - Prevents publishing a package where `@effect-native/libsqlite/effect` fails to resolve.

## 3.50.201

### Patch Changes

- [#81](https://github.com/effect-native/effect-native/pull/81) [`8123006`](https://github.com/effect-native/effect-native/commit/8123006af2992a69486e41bdf46f859e033e2f2b) Thanks @subtleGradient! - unbroke build process to actually include the lib files

## 3.50.201

### Patch Changes

- [#73](https://github.com/effect-native/effect-native/pull/73) [`6dbea70`](https://github.com/effect-native/effect-native/commit/6dbea705cc0cbb0aad92e60785a8179bd8555434) Thanks @subtleGradient! - Release summary:
  - Unify SQLite 3.50.2 across macOS (arm64/x86_64) and Linux (glibc x86_64/aarch64) with prebuilt dylib/so binaries.
  - Add per-platform metadata (metadata.json) including nixpkgs rev, sha256, sqliteVersion, and arch; assert mac arm64/x86_64 are distinct.
  - Zero runtime dependencies; simple root/paths API; optional Effect subpath with Layer.sync and typed error.
  - Friendly, inclusive errors for unsupported platforms (invite requests; list supported targets).
  - Tests with @effect/vitest for error mapping and explicit platform paths; JSDoc examples added for all path constants.
  - Nix flake outputs with loadable extensions enabled; helper scripts to prebuild and regenerate metadata.
