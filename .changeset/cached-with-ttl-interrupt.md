---
"effect": patch
---

Allow interrupting `Effect.cachedWithTTL` and `Effect.cachedInvalidateWithTTL` while the cached effect is running. Interrupting the caller now interrupts that run and leaves nothing cached, so the next call runs the effect again.
