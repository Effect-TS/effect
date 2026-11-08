---
"effect": patch
"@effect/opentelemetry": patch
---

Leave successful spans and failures without errors Unset instead of Ok in `OtlpTracer` and `OtelTracer`, preserving explicit application statuses.

Update dashboards and queries filtering on Ok to include Unset for these spans.
