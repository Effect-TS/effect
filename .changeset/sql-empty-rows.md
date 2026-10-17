---
"effect": patch
---

`sql.insert([])` and `sql.updateValues([])` fail with a clear error instead of reading columns from a missing row.
