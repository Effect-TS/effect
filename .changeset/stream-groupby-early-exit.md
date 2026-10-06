---
"effect": patch
---

Fix `Stream.groupBy`, `Stream.groupByKey`, `Stream.partition`, and `Stream.partitionEffect` hanging when a substream consumer stops early by shutting down its queue when the consumer finishes.
