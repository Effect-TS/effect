---
"effect": minor
---

Let SQL drivers outside this repository use their own dialect name. `Statement.Dialect` now accepts any string, and `onDialect` and `onDialectOrElse` accept branches for custom names. `onDialect` branches are now optional, and it throws an error naming the dialect when the client's dialect has no branch.

The persistence, event log, cluster storage and `Migrator` modules now fail with that error on dialects they have no SQL for, instead of running SQLite SQL. This includes ClickHouse in all of them except `Migrator`. Code that switches exhaustively over `compiler.dialect` needs a default case.
