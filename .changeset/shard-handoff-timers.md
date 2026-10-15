---
"@effect/cluster": patch
---

Add `ClusterMetrics.shardReleaseDuration` timer, recording how long each shard release takes on reassignment, including retries.
