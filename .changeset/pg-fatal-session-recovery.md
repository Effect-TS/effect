---
"@effect/sql-pg": patch
---

Prevent immediate queries from reusing a PostgreSQL connection after a fatal session error. The pool replaces the failed connection before the next query borrows one.
