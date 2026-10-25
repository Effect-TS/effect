---
"effect": patch
---

Fix `PartitionedSemaphore` deadlocking when waiters in different partitions request multiple permits, by completing one waiter before rotating to the next partition.
