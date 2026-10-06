---
"effect": patch
---

OtlpMetrics now exports each summary as a single OTLP Summary metric named `<id>`, replacing the `<id>_quantiles`, `<id>_count` and `<id>_sum` Sum metrics. Count and sum are lifetime totals, quantile values are the configured quantiles over the sliding window, and summaries are cumulative regardless of the configured temporality. The `unit` / `time_unit` attributes become the metric unit, mapped to UCUM (for example `milliseconds` to `ms`), and are no longer exported as data point attributes. Bigint values beyond 2^53 keep their precision.
