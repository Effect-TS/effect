---
"effect": patch
"@effect/sql-trino": patch
---

Add `@effect/sql-trino`, an Effect SQL client and migrator for Trino, and the `trino` SQL dialect.

`Statement.Dialect` now includes `"trino"`, so `sql.onDialect` needs a `trino` branch, and exhaustive checks on the dialect need a `"trino"` case. Calls that use `sql.onDialectOrElse` keep compiling unchanged.
