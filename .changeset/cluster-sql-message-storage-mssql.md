---
"effect": patch
---

Fix SQL Server support in cluster `SqlMessageStorage`. Message claims and duplicate checks now use valid T-SQL. The SQL Server tables use filtered unique indexes instead of nullable `UNIQUE` constraints, and `NVARCHAR(MAX)` instead of `TEXT`, so keyless messages and chunked replies can be stored.
