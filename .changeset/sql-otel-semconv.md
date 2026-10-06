---
"effect": patch
"@effect/sql-d1": patch
---

Align SQL tracing with OpenTelemetry database semantic conventions. Statement spans are renamed from `sql.execute` to the `db.system.name` value (falling back to `sql.execute` when it is unset), and `db.operation.name` is no longer set to Effect method names, which now go in `effect.sql.method`. Transaction span events are renamed to `effect.sql.transaction.commit|savepoint|rollback`, and D1 batches of two or more statements are named `BATCH` with `db.operation.name` `BATCH` and `db.operation.batch.size`.
