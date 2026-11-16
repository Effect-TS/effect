---
"effect": minor
"@effect/sql-pg": minor
---

Add `acquiring` to `Pool.stats` and `PgClient.poolStats` to count in-flight acquisitions independently of waiting borrowers.

Manually constructed `Pool.Stats` snapshots must include `acquiring` (use `0` when no acquisition is running).
