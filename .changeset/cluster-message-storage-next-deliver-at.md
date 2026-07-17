---
"effect": patch
---

Add a required `MessageStorage.nextDeliverAt` operation that returns the earliest future scheduled delivery time for a set of shards, with memory and SQL driver implementations and a supporting index migration for all SQL dialects.
