---
"effect": patch
---

`SqlRunnerStorage` row-based shard locks (`shardLockDisableAdvisory`, SQL Server and SQLite) are no longer renewed by a holder that is not a registered runner, so a runner that keeps refreshing after unregistering, such as one stuck shutting down, now loses its shards when the lease expires instead of holding them indefinitely. A shutting-down runner keeps its locks until it releases them or `shardLockExpiration` elapses after its last renewal, so its entities should finish within that window.
