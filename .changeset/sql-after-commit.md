---
"effect": patch
---

Add `SqlClient.afterCommit`, which runs an effect once the outermost transaction commits, or immediately outside a transaction.
