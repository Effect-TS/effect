---
"effect": patch
"@effect/sql-d1": patch
---

Align SQL tracing with OpenTelemetry database conventions:

- Name statement spans by `db.namespace`, `server.address[:server.port]` or `db.system.name`, falling back to `sql.execute`. The rules are exported as `Statement.spanName` and `Statement.spanTarget`.
- Record Effect execution methods in `effect.sql.method` instead of `db.operation.name`.
- Use internal transaction spans with `effect.sql.transaction.commit|savepoint|rollback` events.
- Name D1 batches of two or more statements `BATCH`, or `BATCH {target}` when a target is set, with `db.operation.name` set to `BATCH` and `db.operation.batch.size`.
