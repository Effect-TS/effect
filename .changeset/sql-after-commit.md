---
"effect": patch
---

Add `SqlClient.afterCommit`, which runs an effect once the outermost transaction commits, or immediately outside a transaction. The effect keeps the services it was registered with, and defects are logged. The SQL `PersistedQueue` store now wakes local takers once an offer commits instead of before.
