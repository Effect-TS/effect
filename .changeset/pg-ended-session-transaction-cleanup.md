---
"@effect/sql-pg": patch
---

Preserve the typed `SqlError` from `withTransaction` when the server ends a PgClient session inside a transaction.
