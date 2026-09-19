---
"@effect/sql-pg": patch
---

Support binary `regclass` and `regclass[]` values as unsigned numeric OIDs. Queries such as the migration runner's table-existence check now decode correctly; cast to `text` in SQL when relation names are needed, for example `SELECT 'public.orders'::regclass::text`.
