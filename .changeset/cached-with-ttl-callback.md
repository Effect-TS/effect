---
"effect": patch
---

Allow `Effect.cachedWithTTL` and `Effect.cachedInvalidateWithTTL` to accept a callback that chooses the time to live from the computation's `Exit`. Return `Duration.zero` for failures to cache only successful results while preserving sharing of in-flight computations.
