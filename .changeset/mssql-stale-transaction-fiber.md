---
"effect": patch
"@effect/sql-mssql": patch
"@effect/sql-sqlite-bun": patch
"@effect/sql-libsql": patch
---

Fail MSSQL `call` and `withoutTransforms()` statements, Bun SQLite `export` and libsql `reserve` with a `SqlError` when run from a fiber that outlives its transaction, instead of using the ended transaction's connection.

Add `SqlClient.currentTransactionConnection` for drivers that look up their transaction connection directly.
