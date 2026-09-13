---
"@effect/sql-pg": patch
---

Preserve the original `SqlError` when a PostgreSQL LISTEN connection fails after registration, allowing consumers to handle the failure and use `Stream.retry` to acquire a new listener. Intentional scope closure continues to interrupt notification consumers.
