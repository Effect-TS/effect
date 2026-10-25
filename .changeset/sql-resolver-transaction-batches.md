---
"effect": patch
---

Keep `SqlResolver` batches separated by transaction when the caller's context has no `SqlClient`, or carries a different client. Requests outside a transaction no longer join a concurrent transaction's batch, where a rollback could discard their writes.
