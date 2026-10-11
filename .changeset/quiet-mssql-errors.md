---
"@effect/sql-mssql": patch
---

Keep the connection error listener after cleanup to handle late Tedious errors without terminating the process.
