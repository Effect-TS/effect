---
"@effect-native/libcrsql": patch
---

Include the `./effect` subpath in the published build and guard it prepublish.

- Remove `src/effect.ts` from `tsconfig.build.json` exclusions so ESM/CJS/DTS are emitted.
- Add `scripts/verify-exports.mjs` and wire `prepublishOnly` to build + verify.
- Prevents `ERR_MODULE_NOT_FOUND` for `@effect-native/libcrsql/effect`.

