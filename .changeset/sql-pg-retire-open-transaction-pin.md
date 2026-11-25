---
"@effect/sql-pg": patch
---

Retire a pinned `PgConnection` session released with an open transaction it began so it is never returned to `PgPool` in transaction state.
