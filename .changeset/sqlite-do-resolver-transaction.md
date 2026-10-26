---
"@effect/sql-sqlite-do": patch
---

Run storage-backed transactions through `SqlClient.makeWithTransaction`, like the other drivers.

- `SqlResolver` requests inside a transaction no longer share a batch with requests outside it when the caller's context has no `SqlClient`. Previously such a batch could hang on the connection, or run outside writes inside the transaction, where a rollback discarded them.
- `Reactivity` invalidations inside a transaction run once the outermost transaction commits, and not at all if it rolls back.
- `afterCommit` callbacks wait for the outermost transaction to commit instead of running immediately.
- Concurrent sibling nested transactions are serialized instead of unsupported.
- Transactions get a `sql.transaction` span.
- A storage rejection while rolling back a transaction, or while completing a nested one, is now a defect instead of a `SqlError`, so typed recovery such as `catchTag` or `retry` no longer handles it. Rejections before the transaction starts and when the outermost transaction commits are still `SqlError`s.
