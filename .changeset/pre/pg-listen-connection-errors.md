---
"@effect/sql-pg": patch
---

Preserve the original `SqlError` when a PostgreSQL LISTEN connection fails after registration, allowing `Stream.retry` to acquire a new listener. Intentional scope closure still interrupts consumers.

Notification queues returned by `PgClient.listen` and `PgConnection.listen` now carry `SqlError`. Update explicit queue and stream type annotations to include this error.
