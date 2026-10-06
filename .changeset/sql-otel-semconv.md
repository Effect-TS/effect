---
"effect": patch
"@effect/sql-d1": patch
---

Align SQL tracing with OpenTelemetry database conventions:

- Name statement spans by `db.namespace`, `server.address[:server.port]` or `db.system.name`, falling back to `sql.execute`. The rule is exported as `Statement.spanName`.
- Record Effect execution methods in `effect.sql.method` instead of `db.operation.name`.
- Use internal transaction spans with `effect.sql.transaction.commit|savepoint|rollback` events.
- Name D1 batches of two or more statements `BATCH`, with `db.operation.name` set to `BATCH` and `db.operation.batch.size`.
