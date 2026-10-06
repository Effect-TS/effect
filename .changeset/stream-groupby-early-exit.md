---
"effect": patch
---

Fix `Stream.groupBy`, `Stream.groupByKey`, `Stream.partition` and `Stream.partitionEffect` hanging when the consumer of one substream stops early. The substream's queue is now shut down when it ends, so later values for it are dropped instead of blocking the other substreams.
