---
"@effect/sql-sqlite-do": patch
---

Reduce statement overhead by borrowing the existing connection under its semaphore.
