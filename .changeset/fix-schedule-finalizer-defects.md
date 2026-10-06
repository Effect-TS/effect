---
"effect": patch
---

Preserve finalizer defects in `Effect.repeat` and `Effect.schedule`. Prevent `Effect.retry` from retrying failures containing defects or interruptions.
