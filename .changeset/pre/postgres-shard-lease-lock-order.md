---
"effect": patch
---

Use a consistent row-lock order for PostgreSQL shard lease acquisition, refresh, and bulk release when `shardLockDisableAdvisory` is enabled.
