---
"@effect/sql-pg": patch
---

Fix `withTransaction` failing with a defect instead of the typed `SqlError` when PostgreSQL ends the session mid-transaction.
