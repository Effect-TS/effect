---
"effect": patch
"@effect/sql-pg": patch
---

Trace the time a statement spends waiting for a connection. With `SpanPropagationEnabled`, every statement span records `db.client.connection.wait_time_ms`, and in `@effect/sql-pg` a statement that waited for a new session gets a `db.connect` child span covering the part of the connect it waited for.
