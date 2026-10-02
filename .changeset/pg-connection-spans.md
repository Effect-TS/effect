---
"@effect/sql-pg": patch
---

Trace the time a statement spends waiting for a pooled PostgreSQL session. With `SpanPropagationEnabled`, the statement's span records `db.client.connection.wait_time_ms`, and a checkout that waited for a new session gets a `db.connect` child span covering the part of the connect it waited for.
