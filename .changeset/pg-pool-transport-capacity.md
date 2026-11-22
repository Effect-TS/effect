---
"@effect/sql-pg": patch
---

Keep a retired `PgPool` session's `maxConnections` slot occupied until its transport emits `close`.
