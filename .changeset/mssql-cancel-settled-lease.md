---
"@effect/sql-mssql": patch
---

Keep an interrupted MSSQL request's connection leased until Tedious settles the cancellation, so the next statement, rollback, or stored procedure on that connection no longer fails with `EINVALIDSTATE`.
