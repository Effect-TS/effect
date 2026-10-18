---
"@effect/sql-mssql": patch
---

Run `withoutTransforms()` statements and stored procedure calls on the active `withTransaction` connection instead of acquiring a separate pooled connection.
