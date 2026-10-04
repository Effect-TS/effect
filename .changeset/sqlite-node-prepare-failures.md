---
"@effect/sql-sqlite-node": patch
---

Do not cache failed statement preparations, allowing queries to retry after transient errors.
