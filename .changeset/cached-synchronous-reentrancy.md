---
"effect": patch
---

Fix synchronous re-entrancy in `Effect.cached`, `Effect.cachedWithTTL`, and `Effect.cachedInvalidateWithTTL` when the cached effect synchronously wakes another fiber that evaluates the same cached effect before the initial evaluation yields.
