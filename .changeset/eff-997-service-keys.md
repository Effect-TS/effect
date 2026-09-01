---
"effect": patch
---

Normalize core service and runtime identities under their owning module namespaces.

`Metric.FiberRuntimeMetricsKey` now has the public value `"effect/Metric/FiberRuntimeMetrics"`. Custom providers and implementations that copy service key or marker strings must adopt the corrected identities.
