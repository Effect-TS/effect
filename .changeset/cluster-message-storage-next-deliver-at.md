---
"effect": patch
---

Add a required `MessageStorage.nextDeliverAt` operation that returns the delay until the earliest future scheduled delivery for a set of shards, with memory and SQL driver implementations, background wake discovery, and a supporting index migration for all SQL dialects.
