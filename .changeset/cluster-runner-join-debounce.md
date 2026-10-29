---
"effect": minor
---

Add `runnerJoinDebounce` to `ShardingConfig`. When set, a runner joining the cluster is only added to shard assignments once the healthy runners have stayed unchanged for that duration, or at most four times that duration after the first pending join. A scale-up or a deployment with a large surge then hands each shard off once instead of once per join. Runners that already hold shards and leave or become unhealthy are still published immediately; a pending runner that leaves only restarts the quiet period. While joins are pending, runners take no new shards, so a shard can stay unlocked briefly until each runner publishes. Defaults to `0`, which keeps the current behavior.
