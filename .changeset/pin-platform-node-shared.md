---
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Pin the shared platform implementation to the matching workspace version so installing a platform adapter cannot silently select a newer, incompatible prerelease of `@effect/platform-node-shared`.
