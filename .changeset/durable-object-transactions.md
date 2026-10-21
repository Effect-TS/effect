---
"@effect/sql-sqlite-do": patch
---

Support `withTransaction` in Durable Objects by passing `storage: ctx.storage` to `SqliteClient`. Transactions, including nested ones, then use `storage.transaction()` instead of the `BEGIN`/`COMMIT`/`ROLLBACK` statements that workerd rejects.
