---
"@effect/opentelemetry": patch
---

Fix delta histogram exports reporting cumulative `min` / `max` alongside interval `count`, `sum` and bucket counts. Delta data points after the first export now omit the optional extrema, since they cannot be derived for the interval.
