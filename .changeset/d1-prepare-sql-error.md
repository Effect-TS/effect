---
"@effect/sql-d1": patch
---

Return a typed `SqlError` instead of dying when `D1Database.prepare()` throws synchronously on `.raw` and `.unprepared` queries.
