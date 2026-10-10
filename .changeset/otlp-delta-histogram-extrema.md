---
"effect": patch
---

Omit `min` and `max` from subsequent delta histogram exports in `OtlpMetrics`: cumulative extrema do not describe the reported interval.
