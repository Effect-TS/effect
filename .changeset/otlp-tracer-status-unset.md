---
"effect": patch
"@effect/opentelemetry": patch
---

`OtlpTracer` and `OtelTracer` now leave the span status Unset instead of Ok when a span succeeds, or fails without a reportable error. `OtelTracer` no longer overwrites a status set directly on the span in those cases.

Queries and dashboards that filter on Ok should also match Unset.
