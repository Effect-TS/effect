---
"effect": patch
---

Allow interrupting `Effect.cachedWithTTL` and `Effect.cachedInvalidateWithTTL` while the cached effect is running. Interrupted runs are not cached.
