---
"@effect/sql-sqlite-do": patch
---

Keep `SqlResolver` requests inside a storage-backed transaction out of batches with requests outside it, even when the caller's context has no `SqlClient`. Previously both shared one batch, which could hang on the connection or run outside writes inside the transaction, where a rollback discarded them.
