---
"effect": patch
---

Add a required `MessageStorage.nextDeliverAt` operation that returns the delay until the earliest future scheduled delivery for a set of shards, with memory and SQL driver implementations and a supporting index migration for all SQL dialects. Setting `ShardingConfig.timelyScheduledMessageDelivery` to `true` enables background deadline discovery and delivery without waiting for the next message poll; it defaults to `false`.
