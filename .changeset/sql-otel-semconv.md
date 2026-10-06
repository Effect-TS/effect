---
"effect": patch
"@effect/sql-d1": patch
---

Align SQL tracing with OpenTelemetry database conventions:

- Name statement spans by `db.namespace`, `server.address[:server.port]`, or `db.system.name`, falling back to `sql.execute`.
- Export the public unstable `Statement.makeSpanName` helper for shared SQL span naming.
- Record Effect execution methods in `effect.sql.method` instead of `db.operation.name`.
- Use internal transaction spans with `effect.sql.transaction.commit|savepoint|rollback` events.
- Name D1 batches of two or more statements `BATCH` (with the target when available) and record `db.operation.name` as `BATCH` and `db.operation.batch.size`.
