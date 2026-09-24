---
"effect": patch
---

Use a consistent row-lock order for PostgreSQL shard lease acquisition, refresh, and bulk release when `shardLockDisableAdvisory` is enabled. This prevents deadlocks between concurrent runners. During a rolling upgrade, old and new runners may still deadlock until all runners are updated.
