---
"@effect/sql-sqlite-node": patch
"@effect/sql-sqlite-bun": patch
---

Retry the WAL switch within `busyTimeout` when another connection holds the write lock, so concurrent first opens of a new database no longer die with `database is locked`. Opening and configuring the database now fail with a typed `SqlError` instead of a defect, so `make`, `layer` and `layerConfig` gain a `SqlError` error channel. `@effect/sql-sqlite-node` also no longer switches `readonly` clients to WAL, which made opening a rollback-journal database read-only fail.
