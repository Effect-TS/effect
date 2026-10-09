---
"effect": patch
---

Allow `SqlRunnerStorage` row-based shard locks to be reclaimed when the holder is unregistered or its heartbeat has expired, even if it keeps refreshing the lock.
