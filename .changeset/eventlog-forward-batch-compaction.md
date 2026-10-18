---
"effect": patch
---

Add `EventLog.groupBatchCompaction` for compaction across primary keys, with explicit forwarding or dropping of undecodable entries. Both compaction APIs now provide `forward(entry)` to preserve entries unchanged at their original batch positions. Align server compaction output ordering with client replay.
