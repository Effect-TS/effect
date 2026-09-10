---
"effect": patch
---

Fix `Effect.cachedWithTTL` and `Effect.cachedInvalidateWithTTL` suppressing interruption (e.g. `Effect.timeout`) of the cached effect.

The cached effect was executed under `uninterruptibleMask` while populating the cache, which prevented interruption-based combinators such as `Effect.timeout` from firing. The cached effect now runs with the caller's interruptibility restored, matching the behaviour of the non-cached effect.
