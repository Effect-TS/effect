---
"effect": patch
---

Fail SQL statements and nested transactions from a fiber that outlives the transaction it was forked in, instead of running them on that transaction's connection.
