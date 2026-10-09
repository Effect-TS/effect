---
"effect": patch
---

Omit cumulative `min` and `max` from delta histogram points in `OtlpMetrics`, matching `@effect/opentelemetry`. After the first export they described every observation since startup instead of the reported interval.
