---
"effect": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
"@effect/platform-node": patch
---

Use layered storage for Context, making `Context.add` O(1) and eliminating per-request service map clones in the HTTP servers. References are stored in the slab automatically; services can opt in with `allocateSlot`.
