---
"@effect/opentelemetry": patch
---

Reduce per-collection allocation in `MetricProducer`; data point attributes are now frozen and shared across collections.
