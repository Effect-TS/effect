---
"@effect/sql-pg": patch
---

Bind inferred empty array parameters as untyped PostgreSQL array literals so the statement can determine their type.
