---
"effect": patch
"@effect/platform-node": patch
---

Avoid loading Node's internal undici on cold start when importing `effect/Schema` or starting a Node HTTP server before any web API is used. `Schema.FormData` resolves the global constructor during validation, and `@effect/platform-node` loads `node:http` and `node:https` without evaluating their lazy web API exports.
