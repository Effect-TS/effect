---
"@effect/sql-pg": patch
---

Decode binary `regclass` and `regclass[]` values as unsigned numeric OIDs, fixing the migration runner's table-existence check. Cast `regclass` values to `text` in SQL to return relation names.
