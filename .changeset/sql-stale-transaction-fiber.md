---
"effect": patch
---

Fail statements and nested `withTransaction` calls from a fiber that outlives the transaction it was forked in, instead of running them on the transaction's connection once the transaction has ended.
