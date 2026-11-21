---
"@effect/sql-pg": patch
---

Document that PgBouncer before 1.26.0 with `multiplex` requires `prepare: false` or a PgBouncer upgrade to avoid `Unexpected ParseComplete during close` errors.
