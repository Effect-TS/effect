---
"effect": minor
---

Use custom SQL dialect names with `Statement.Dialect`, `onDialect` and `onDialectOrElse`. Branches are optional in `onDialect`; a missing match throws. Use `onDialectOrElse` for a fallback.

### Breaking changes

- Add a default case to exhaustive switches over `compiler.dialect`: dialect names can now be any string.
- Persistence, event log, cluster storage and `Migrator` reject unsupported dialects instead of running SQLite SQL. Of these, only `Migrator` supports ClickHouse.
- Pass branch callbacks separately from non-callback fields. For branch maps typed as interfaces or class instances, omit explicit type arguments and let TypeScript infer them.
