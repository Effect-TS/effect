---
"@effect/cluster": patch
---

Add `ClusterMetrics.entityMailboxMax` gauge, reporting the largest single-entity mailbox (in-flight requests) per entity type on each runner.
