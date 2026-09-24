---
"@effect/sql-pg": patch
---

Close the `pg.Pool` when `PgClient` fails its initial connection check, and make `connectTimeout` interrupt a hanging check.
