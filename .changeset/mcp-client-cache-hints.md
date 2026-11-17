---
"effect": patch
---

Add `McpClient.listToolsWithCacheHint`, which returns a server's tools with the `2026-07-28` cache hint of the snapshot: the smallest `ttlMs` of its pages, and `"public"` only when every page says so. Earlier protocol revisions send no hint, so it is `undefined` there. `listTools` is unchanged.
