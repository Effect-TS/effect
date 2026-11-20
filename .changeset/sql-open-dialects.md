---
"effect": minor
---

SQL drivers can use custom dialect names: `Statement.Dialect` accepts any string and `onDialectOrElse` accepts branches for custom names.

### Breaking changes

- `onDialect` is removed. Call `onDialectOrElse` and add an `orElse` branch for dialects you don't handle.
- Add a default case to exhaustive switches over `compiler.dialect`, since dialect names can now be any string.
- The persistence, event log and cluster storage modules and `Migrator` fail with a defect on dialects they have no SQL for, instead of running SQLite SQL. Only `Migrator` supports ClickHouse.
- `onDialectOrElse` only selects branches that are own properties of the options object. Methods inherited from a class are ignored, so pass a plain object instead.
