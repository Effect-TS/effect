---
"@effect/sql-drizzle": patch
---

Support `db.batch` in `@effect/sql-drizzle/Sqlite`. Batched queries run in order inside a single transaction.
