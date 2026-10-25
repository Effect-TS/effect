---
"effect": minor
---

Add a `cacheHints` option to the `McpServer` layers to set the private `ttlMs` that `v2026_07_28` discovery and list results advertise, for example `cacheHints: { tools: { ttlMs: 60_000, cacheScope: "private" } }`. Results without a hint, and `resources/read`, keep `{ ttlMs: 0, cacheScope: "private" }`.
