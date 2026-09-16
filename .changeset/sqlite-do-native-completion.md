---
"@effect/sql-sqlite-do": patch
---

Propagate native Durable Object transaction completion failures as typed SQL errors instead of reporting a successful commit after rollback.
