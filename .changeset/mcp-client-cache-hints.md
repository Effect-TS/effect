---
"effect": patch
---

Add `McpClient.listToolsWithCacheHint` and `ListCacheHint` to return discovered tools alongside their aggregated `2026-07-28` cache hint (minimum `ttlMs`, `"public"` only when every page is `"public"`, or `undefined` when unavailable).
