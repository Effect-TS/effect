---
"effect": patch
"@effect/sql-pg": patch
---

Stop PgClient transactions from staying open after a pooler drops their prepared statements.
