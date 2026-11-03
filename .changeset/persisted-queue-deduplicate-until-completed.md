---
"effect": patch
---

Add a `deduplicate: "untilCompleted"` option to `PersistedQueue` `offer`, which enqueues an id again once its previous element has completed.
