---
"effect": minor
---

Add encrypted remote compaction groundwork to the event log. `EventLog.groupCompaction`, `EventLog.groupBatchCompaction` and `Registry.registerCompaction` take a `remote` option that opts a compactor into building snapshots of a remote's history, and `Registry.compactors` values carry `remote`. `EventRow.compaction` is opted in. A remote compaction only drops entries: a call that writes a new entry keeps its whole input, and entries that fail to decode, including entries with fields the schema does not know, are always kept.

`EventLogServerEncrypted.Storage` gains an optional `compaction` member with the storage primitives for encrypted remote compaction: status, begin, input headers, fetch, staged parts, commit, no-op recording, abort, withdraw, rollback and history. `makeCompactionConfig` resolves the shared tuning (grace, lag, stage TTL, threshold floor and sweep interval) and rejects a grace that isn't longer than the lag and the stage TTL. The memory storage always provides `compaction`, serves an active snapshot through `changes`, and prunes superseded generations after the grace period. `makeStorageMemoryWith` and `layerStorageMemoryWith` configure it.
