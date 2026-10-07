---
"effect": patch
---

Persist failure replies for cluster entity RPCs annotated with `ClusterSchema.WithTransaction`. Typed failures and non-fatal defects are now saved after the handler transaction rolls back, so retries, deduplicated callers and other runners receive the stored reply instead of waiting indefinitely. Success replies still commit atomically with the handler's writes.
