---
"effect": patch
---

Stop a runner that lost a shard lock from storing the final reply of a persisted request on that shard. Before storing it, the runner asks lock storage whether it still owns the shard. If not, the request is left for the shard's new owner.

`RunnerStorage` gains an `owned` method. `RunnerStorage.makeEncoded` takes it as an optional `Encoded.owned`, and storages without it keep relying on the runner's own view of its shards. `SqlRunnerStorage` implements it.
