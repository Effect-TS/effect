---
"@effect/sql-mssql": patch
---

Fix `sql.insert` and `sql.updateValues` binding parameters in the wrong order on SQL Server when the `returning` fragment has parameters.
