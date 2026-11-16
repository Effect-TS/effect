---
"effect": patch
---

Fix cluster shards staying unowned while a runner's shard lock operations keep failing but its heartbeat still works. After `shardLockExpiration` the runner now unregisters, so other runners take its shards, and it registers again once a lock operation succeeds.
