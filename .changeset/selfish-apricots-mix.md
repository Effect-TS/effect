---
"@effect/sql-mysql2": patch
"@effect/sql-mssql": patch
---

Use an unprepared `SELECT 1` statement to test the DB connection during client initialization instead of a prepared statement.
