---
"@effect/sql-pg": patch
---

PgClient: add `statementTimeout` and `queryTimeout` options, passed through to `pg`'s `statement_timeout` / `query_timeout`.
