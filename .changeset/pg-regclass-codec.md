---
"@effect/sql-pg": patch
---

Support binary `regclass` and `regclass[]` values as unsigned numeric OIDs. Queries such as the migration runner's table-existence check now decode correctly; cast to `text` when relation names are needed.
