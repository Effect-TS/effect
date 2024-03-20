---
"@effect/opentelemetry": patch
---

Make @effect/opentelemetry metrics conform to the spec

- Metric labels add new data points instead of completely new metric data
- Start times are determined from the first occurrence of a metric
