---
"@effect/cluster": patch
---

Bound shard lock renewal during shutdown by `entityTerminationTimeout`, preserving the configured drain window. Within one `shardLockRefreshInterval` after that window expires, stop renewal, request forced interruption, and begin repeated lock release attempts, including for advisory locks. Prevent stuck singletons from delaying interruption of others and reject late acquisitions after shutdown starts.

Lock release depends on storage availability; work that ignores interruption may overlap with the next shard owner. Send retries without a retry budget remain indefinite until the caller interrupts them.
