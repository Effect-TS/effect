---
"effect": patch
---

SQL transactions now trace `BEGIN`, `COMMIT`, `ROLLBACK` and savepoint statements as child spans of `sql.transaction`, replacing its `effect.sql.transaction.commit`, `savepoint` and `rollback` events; with `Statement.SpanPropagationEnabled`, the transaction also parents connection spans and records its connection wait time.
