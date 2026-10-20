---
"effect": minor
---

Add encrypted remote compaction groundwork to the event log. `EventLog.groupCompaction`, `EventLog.groupBatchCompaction` and `Registry.registerCompaction` take a `remote` option that opts a compactor into building snapshots of a remote's history, and `Registry.compactors` values carry `remote`. `EventRow.compaction` is opted in. A remote compaction only drops entries: a call that writes a new entry keeps its whole input, and entries that fail to decode, including entries with fields the schema does not know, are always kept.
