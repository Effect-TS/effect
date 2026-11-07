---
"effect": patch
"@effect/sql-libsql": patch
"@effect/sql-mssql": patch
"@effect/sql-sqlite-bun": patch
---

Reject statements, savepoint commands and libsql `reserve` from fibers that outlive `withTransaction` with a `ConnectionError` instead of reusing its connection.
