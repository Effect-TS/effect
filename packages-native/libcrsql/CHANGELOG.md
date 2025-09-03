# @effect-native/libcrsql Changelog

## 0.16.303

### Patch Changes

- [#90](https://github.com/effect-native/effect-native/pull/90) [`4c4e1ca`](https://github.com/effect-native/effect-native/commit/4c4e1ca61f34cdf30133827d018c0b5f68eb0611) Thanks @subtleGradient! - Include the `./effect` subpath in the published build and guard it prepublish.
  - Remove `src/effect.ts` from `tsconfig.build.json` exclusions so ESM/CJS/DTS are emitted.
  - Add `scripts/verify-exports.mjs` and wire `prepublishOnly` to build + verify.
  - Prevents `ERR_MODULE_NOT_FOUND` for `@effect-native/libcrsql/effect`.

## 0.16.302

### Patch Changes

- [#84](https://github.com/effect-native/effect-native/pull/84) [`c9b303a`](https://github.com/effect-native/effect-native/commit/c9b303a3cc23f34eb10fdaa80e217475046edb55) Thanks @subtleGradient! - README example how to embed and use libsqlite and crsqlite in a compiled Bun single file executable

- [#87](https://github.com/effect-native/effect-native/pull/87) [`ddac582`](https://github.com/effect-native/effect-native/commit/ddac5829f4280305092dd552f99e0d691ad25399) Thanks @subtleGradient! - Include the `./effect` subpath in the published build and guard it prepublish.
  - Remove `src/effect.ts` from `tsconfig.build.json` exclusions so ESM/CJS/DTS are emitted.
  - Add `scripts/verify-exports.mjs` and wire `prepublishOnly` to build + verify.
  - Prevents `ERR_MODULE_NOT_FOUND` for `@effect-native/libcrsql/effect`.

## 0.16.301

### Patch Changes

- [#81](https://github.com/effect-native/effect-native/pull/81) [`8123006`](https://github.com/effect-native/effect-native/commit/8123006af2992a69486e41bdf46f859e033e2f2b) Thanks @subtleGradient! - unbroke build process to actually include the lib files

All notable changes to this project will be documented in this file.

## 0.16.3

- Initial release with absolute paths for cr-sqlite v0.16.3 binaries (macOS arm64/x64, Linux arm64/x64, Windows x64/i686)
- Root sync API and Effect entrypoint
- Static absolute paths entrypoint
- Browser guard and docgen config
