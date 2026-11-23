---
"@effect/sql-pg": patch
---

Document that `multiplex` behind PgBouncer before 1.26.0 needs `prepare: false` or a PgBouncer upgrade to avoid `Unexpected ParseComplete during close` errors.
