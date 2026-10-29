---
"effect": minor
---

Add the `runnerJoinDebounce` option to `ShardingConfig`. When it is set, runners joining the cluster are only added to shard assignments once the healthy runners have stayed unchanged for the debounce, or at most four debounce periods after the first pending join. A burst of joins, such as a scale-up or a deployment with a large surge, then hands each shard off once instead of once per join. Runners that leave or become unhealthy are still applied immediately. While joins are pending, runners don't take new shards, so a shard can stay unlocked briefly between runners publishing. The default of `0` keeps the current behavior.
