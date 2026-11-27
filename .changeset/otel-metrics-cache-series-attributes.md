---
"@effect/opentelemetry": patch
---

Derive the reported attributes and series key of a metric once per series instead of on every `MetricProducer` collection, so collecting a registry with many series allocates far less.
