---
"@effect/sql-pg": patch
---

Fix a `PgConnection` stream started as its pin is released hanging instead of failing.
