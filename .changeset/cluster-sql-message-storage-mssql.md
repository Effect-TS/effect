---
"effect": patch
---

Fix SQL Server support in cluster `SqlMessageStorage`. Message claims lock rows with `UPDLOCK` instead of the invalid `FOR UPDATE`, and duplicate detection no longer uses subqueries in `MERGE … OUTPUT`. A new migration replaces the nullable `UNIQUE` constraints with filtered unique indexes, so messages without a primary key and chunk replies can be stored, and converts the `TEXT` payload and headers columns to `NVARCHAR(MAX)`.
