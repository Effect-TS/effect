---
"effect": minor
"@effect/sql-pg": minor
"@effect/sql-libsql": minor
---

Add `SqlClient.batch`, which returns each statement's rows as a typed tuple and runs as one atomic round trip on PostgreSQL (also via the new `PgConnection.batch`) and libSQL, or one statement at a time on drivers without the new optional `Connection.executeBatch` hook.
