---
"effect": patch
"@effect/sql-mssql": patch
"@effect/sql-sqlite-bun": patch
"@effect/sql-libsql": patch
---

Fail MSSQL stored procedures and `withoutTransforms()` statements, SQLite (Bun) exports and libsql `reserve` from a fiber that outlives its transaction, instead of running them on the transaction's connection once the transaction has ended. Adds `SqlClient.currentTransactionConnection` for drivers that look up the transaction connection themselves.
