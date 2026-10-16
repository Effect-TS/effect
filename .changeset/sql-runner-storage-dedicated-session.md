---
"effect": patch
"@effect/sql-pg": patch
"@effect/sql-mysql2": patch
---

Stop SQL runner storage from starving PostgreSQL and MySQL clients with one connection. Shard locks now run on a session from the new `SqlClient.reserveSession`, which the pg and mysql2 clients open outside their pool with the client's connection settings. Runner storage therefore uses one connection more than `maxConnections` and no longer takes one from the pool. Drivers that do not provide a `sessionAcquirer` fall back to `reserve`.
