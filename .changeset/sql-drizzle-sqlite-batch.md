---
"@effect/sql-drizzle": patch
---

Support `db.batch` in `@effect/sql-drizzle/Sqlite`. Batched queries run in order inside a single transaction.

Fix single-row SQLite queries such as `findFirst()` and `.get()`, which returned `undefined` column values, or an empty row instead of `undefined` when nothing matched. As a result, raw `db.get(sql)` queries now return a positional array of values instead of an object, matching raw `db.all(sql)`.
