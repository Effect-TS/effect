---
"effect": patch
---

Fix `RequestResolver.withCache` to call the wrapped resolver's `preCheck` on cache misses, preserving hook completion and nested cache reuse.
