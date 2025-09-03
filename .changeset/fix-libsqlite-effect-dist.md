---
"@effect-native/libsqlite": patch
---

Add prepublish verification for the `./effect` subpath artifacts.

- Introduce `scripts/verify-exports.mjs` that checks `dist/dist/{esm,cjs,dts}/effect.*` and attempts an ESM import.
- Wire `prepublishOnly` to build + verify and whitelist the script in `files`.
- Prevents publishing a package where `@effect-native/libsqlite/effect` fails to resolve.

