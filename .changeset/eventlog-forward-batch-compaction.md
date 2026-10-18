---
"effect": patch
---

Add `forward` to `EventLog.groupCompaction` so a compactor can keep an entry unchanged, with its original id and its position in the batch. Add `EventLog.groupBatchCompaction`, which passes every entry of the group's batch to one compactor call in order, including entries that cannot be decoded. `EventLogServerUnencrypted.compactBacklog` now orders compacted entries by their source position, matching client replay.
