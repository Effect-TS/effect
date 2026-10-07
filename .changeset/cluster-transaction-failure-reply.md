---
"effect": patch
---

Fix persisted `ClusterSchema.WithTransaction` requests losing their reply when the handler fails. The handler's writes are still rolled back, and the failure reply is now saved after the rollback, so retries no longer wait forever.
