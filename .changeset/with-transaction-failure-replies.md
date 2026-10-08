---
"effect": patch
---

Fix lost failure replies for persisted cluster RPCs using `ClusterSchema.WithTransaction`. Save typed failures and non-fatal defects after rollback so retries receive the stored reply. Successful replies still commit with the handler's writes.
