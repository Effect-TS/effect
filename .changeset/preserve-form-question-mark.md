---
"effect": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
"@effect/platform-browser": patch
---

Preserve a leading `?` in URL-encoded form field names. `urlParamsBody` previously dropped it as a query-string prefix, so `?name=value` decoded to `name`.
