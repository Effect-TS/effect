---
"effect": patch
---

Fix `Migrator` skipping a migration with id `0` (such as `0000_init`) on a fresh database.
