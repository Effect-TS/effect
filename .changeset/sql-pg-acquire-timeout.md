---
"@effect/sql-pg": patch
---

Add an `acquireTimeout` option to `PgClient` and `PgPool` that bounds the wait for a pooled connection, failing with a `ConnectionError` when the pool stays exhausted.
