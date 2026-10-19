---
"effect": patch
---

Repeat the stalled forced shard release warning every `max(shardLockExpiration, 30 seconds)` while the release stays pending, and add the `ClusterMetrics.shardsReleasing` gauge (`effect_cluster_shards_releasing`) counting the shards a runner is still releasing.
