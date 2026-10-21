---
"effect": patch
---

Fix SQL Server support in cluster `SqlMessageStorage`. Message claims and duplicate checks now use valid T-SQL, and a new migration replaces the nullable `UNIQUE` constraints with filtered unique indexes and converts the `TEXT` columns to `NVARCHAR(MAX)`, so keyless messages and chunked replies can be stored.
