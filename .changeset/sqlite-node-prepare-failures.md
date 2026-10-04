---
"@effect/sql-sqlite-node": patch
---

Stop caching failed statement preparations, so a query that failed to prepare because of a missing table or a lock succeeds once the condition clears.
