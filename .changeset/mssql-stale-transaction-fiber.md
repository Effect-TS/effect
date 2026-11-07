---
"effect": patch
"@effect/sql-mssql": patch
"@effect/sql-sqlite-bun": patch
"@effect/sql-libsql": patch
---

Fail MSSQL `call` and `withoutTransforms()`, Bun SQLite `export` and libsql `reserve` from a fiber that outlived its transaction, and add `SqlClient.currentTransactionConnection` for custom drivers.
