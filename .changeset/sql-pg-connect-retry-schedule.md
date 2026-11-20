---
"@effect/sql-pg": minor
---

Add an optional `connectRetrySchedule` option to `PgClient` and `PgPool` to retry retryable connection errors during pool checkout before any statement is sent.
