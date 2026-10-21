---
"effect": patch
---

Preserve undecodable event payloads unchanged during group compaction so they do not stall replication or prevent valid events from being compacted.
