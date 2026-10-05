---
"@effect/opentelemetry": patch
---

Omit cumulative `min` and `max` from delta histogram points after the first export. First-export and cumulative histogram extrema are unchanged.
