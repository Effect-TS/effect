---
"@effect/sql-pg": patch
---

Close a pinned session that is released with a transaction it began still open, so a connection left inside `BEGIN` is never returned to the pool.
