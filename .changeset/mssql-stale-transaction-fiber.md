---
"effect": patch
"@effect/sql-mssql": patch
"@effect/sql-sqlite-bun": patch
"@effect/sql-libsql": patch
---

Reject ended transactions in MSSQL `call`/`withoutTransforms()`, Bun SQLite `export` and libsql `reserve`, and expose `SqlClient.activeTransactionConnection` for custom drivers.
