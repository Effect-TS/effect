---
"effect": patch
---

Warn when a forced cluster shard release remains pending beyond `shardLockExpiration`, including the affected shards and pending entity types and singletons. Release failures now emit rate-limited warnings while preserving the requirement that teardown and lock release finish before reacquisition.
