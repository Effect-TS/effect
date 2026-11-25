---
"@effect/sql-pg": patch
---

Close a pinned `PgConnection` session released inside a transaction it began so it is not returned to `PgPool`.
