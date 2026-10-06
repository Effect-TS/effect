---
"effect": patch
---

OtlpMetrics now exports each summary as a single OTLP Summary metric named `<id>`, replacing the `<id>_quantiles`, `<id>_count` and `<id>_sum` Sum metrics. Count, sum, min and max are cumulative since the metric was created (min/max as quantiles 0 and 1), configured quantiles reflect the sliding window, and summaries are cumulative regardless of the configured temporality. The `unit` / `time_unit` attributes become the metric unit, mapped to UCUM (for example `milliseconds` to `ms`), and are no longer exported as data point attributes. Bigint values beyond 2^53 keep their precision.
