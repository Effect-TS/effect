---
"effect": patch
---

OtlpMetrics exports each summary as one OTLP Summary metric named `<id>` instead of `<id>_quantiles`, `<id>_count` and `<id>_sum` Sum metrics. Summaries are always cumulative. Common unit names such as `milliseconds` are mapped to UCUM, and bigint values beyond 2^53 keep their precision.
