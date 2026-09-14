---
"@effect/sql-pg": patch
---

Accept numeric Unix epoch milliseconds for `timestamp` and `timestamptz` parameters without casts or `PgTypes` wrappers, including fields using `Model.DateTimeInsertFromNumber`. Ordinary numeric parameters retain their existing inferred types.
