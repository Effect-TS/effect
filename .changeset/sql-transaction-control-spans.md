---
"effect": patch
---

With `Statement.SpanPropagationEnabled`, SQL transactions now trace `BEGIN`, `COMMIT`, `ROLLBACK` and savepoint statements as child spans of `sql.transaction`, parent connection acquisition to it, and record its connection wait time.
