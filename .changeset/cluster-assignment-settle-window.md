---
"effect": minor
---

Add the `assignmentSettleWindow` option to `ShardingConfig`. When it is set, runners joining the cluster are only added to shard assignments once the healthy runners stay unchanged for the window, or four windows after the first pending join. A burst of joins, such as a rolling deployment, then hands each shard off once instead of once per join. Runners that leave or become unhealthy are still applied immediately. The default of `0` keeps the current behavior.
