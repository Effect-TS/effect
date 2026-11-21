---
"@effect/sql-pg": patch
---

Fix multiplexed `PgConnection` retaining completed queries in memory until the pipeline fully drains.
