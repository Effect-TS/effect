---
"effect": patch
---

Restore `idle_session_timeout` on the PostgreSQL shard-lock connection before `SqlRunnerStorage` returns it to the pool, so other queries on that connection no longer have their session ended after `shardLockExpiration` idle.
