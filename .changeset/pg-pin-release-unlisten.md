---
"@effect/sql-pg": patch
---

Wait for an in-flight `UNLISTEN` when a pinned `PgConnection` is released, instead of retiring the connection as if it had leaked work.
