---
"effect": patch
---

`SqlRunnerStorage` row-based shard locks (`shardLockDisableAdvisory`, and SQL Server and SQLite) can now be acquired from a holder that is no longer a registered runner, even if the holder keeps refreshing the lock. Previously such a shard could stay unowned indefinitely.
