---
"effect": patch
---

Make `Effect.cachedInvalidateWithTTL` recompute after an invalidation that happens while the cached effect is still running, instead of caching the stale result.
