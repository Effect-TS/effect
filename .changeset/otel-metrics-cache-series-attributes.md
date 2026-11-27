---
"@effect/opentelemetry": patch
---

Reduce what `MetricProducer` allocates on every collection of a registry with many series; data point attributes are now shared across collections and frozen.
