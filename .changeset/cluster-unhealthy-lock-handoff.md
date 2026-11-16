---
"effect": patch
---

Fix cluster shards running nowhere while a runner's shard lock operations keep failing, by unregistering it after `shardLockExpiration` until it can acquire locks again.
