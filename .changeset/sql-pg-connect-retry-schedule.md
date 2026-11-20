---
"@effect/sql-pg": minor
---

Add an optional `connectRetrySchedule` to `PgClient` and `PgPool` that retries retryable connection errors on checkout, before any statement is sent.
