---
"effect": patch
---

`ClusterMetrics.entities` now reads the active entity count when metrics are snapshotted, instead of being updated by a loop once a second. The series is recorded in the `MetricRegistry` of the entity manager's context and removed when the entity manager shuts down.
