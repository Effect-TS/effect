---
"effect": minor
---

Allow custom SQL dialect names in `Statement.Dialect` and `onDialectOrElse`.

### Breaking changes

- `onDialect` is removed. Use `onDialectOrElse` with an `orElse` fallback.
- Exhaustive switches over `compiler.dialect` require a default case now that `Statement.Dialect` accepts any string.
- Persistence, event log, cluster storage, and `Migrator` fail with a defect on unsupported dialects instead of falling back to SQLite SQL. Only `Migrator` supports ClickHouse.
- `onDialectOrElse` only selects own properties; pass a plain object rather than a class instance with inherited methods.
- Every property passed to `onDialectOrElse` must be a branch callback or `orElse`; keep non-callback metadata outside the options object.
- Omit explicit type arguments when passing a named interface to `onDialectOrElse` so TypeScript can infer the branch types.
