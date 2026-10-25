---
"effect": patch
---

Keep `SqlResolver` batches separated by transactions started with `SqlClient.makeWithTransaction` when the caller's context has no `SqlClient`, or carries a different client. Requests outside such a transaction no longer join its batch, where a rollback could discard their writes. Clients with their own `withTransaction`, such as `@effect/sql-sqlite-do`, are still only recognized when they are the `SqlClient` in the caller's context.
