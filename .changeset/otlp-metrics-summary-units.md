---
"effect": patch
---

Export summaries as a single OTLP Summary metric named `<id>` instead of `<id>_quantiles`, `<id>_count` and `<id>_sum`. Count and sum remain cumulative regardless of temporality; only configured quantiles with observations in the sliding window are exported. Update queries that use the old metric names.

Normalize common `unit` / `time_unit` values to UCUM and remove those attributes from data points, except where retaining them prevents distinct series from colliding. Series with different normalized units export as separate metrics.

Preserve counter and gauge bigint precision outside the safe integer range with decimal strings in OTLP/JSON.
