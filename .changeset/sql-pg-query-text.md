---
"@effect/sql-pg": patch
---

Add `queryText` to `PgClient` and `PgConnection`, which returns positional rows with each value as the server's text.
