---
"effect": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
"@effect/platform-node": patch
---

Use layered storage for Context, making `Context.add` O(1) and eliminating per-request service map clones in the HTTP servers. Services and references can opt into cached O(1) reads with `enableCaching`.
