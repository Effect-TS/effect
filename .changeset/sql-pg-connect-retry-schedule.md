---
"@effect/sql-pg": minor
---

Add `connectRetrySchedule` to `PgClient` and `PgPool` to retry connection failures on checkout before any statement is sent.
