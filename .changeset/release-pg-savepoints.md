---
"effect": patch
"@effect/sql-pg": patch
---

Release PostgreSQL savepoints after nested transactions succeed or roll back, preventing transaction locks from accumulating until the outer transaction completes.
