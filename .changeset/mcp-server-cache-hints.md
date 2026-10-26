---
"effect": minor
---

Add a `cacheHints` option to the `McpServer` layers to set how long clients may treat `v2026_07_28` discovery and list results as fresh, for example `cacheHints: { tools: { ttl: "1 minute", cacheScope: "private" } }`. Results without a hint, and `resources/read`, keep `{ ttlMs: 0, cacheScope: "private" }`.
