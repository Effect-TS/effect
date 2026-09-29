---
"effect": patch
"@effect/sql-pg": patch
---

Fail `@effect/sql-pg` transactions when PostgreSQL returns `ROLLBACK` for `COMMIT` after a caught statement error. `SqlClient.make` accepts a commit effect so drivers can inspect the result.
