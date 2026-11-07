---
"@effect/sql-mssql": patch
---

Fix `sql.insert` and `sql.updateValues` with a `returning` fragment that has parameters binding every placeholder to the wrong value on SQL Server.
