---
"effect": patch
---

`SqlRunnerStorage` row-based shard locks (`shardLockDisableAdvisory`, SQL Server and SQLite) are no longer renewed by a runner that is not registered. A runner stuck after unregistering, such as during shutdown, now loses its shards when the lease expires instead of holding them indefinitely, so a shutting-down runner's entities should finish within `shardLockExpiration` of its last renewal.
