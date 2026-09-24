---
"effect": patch
---

Order PostgreSQL shard lease row locks consistently across acquisition, refresh, and bulk release when `shardLockDisableAdvisory` is enabled. This prevents deadlocks between workers acquiring expired leases and workers refreshing or releasing overlapping leases.
