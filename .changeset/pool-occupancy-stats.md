---
"effect": minor
"@effect/sql-pg": minor
---

Add the unstable `Pool.Stats` and `Pool.stats` APIs for sampling how many pool items are idle or in use and how many borrowers are waiting. `PgPool.stats` and `PgClient.poolStats` expose the same snapshot for PostgreSQL sessions, so applications can export connection pool metrics without reaching into pool internals.
