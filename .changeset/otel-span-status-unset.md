---
"effect": patch
"@effect/opentelemetry": patch
---

Spans that previously exported status `Ok` now export `Unset`, as the OpenTelemetry spec requires of instrumentation libraries. This covers successful, interrupted, and empty-cause spans, and a status description is now only set on `Error`.
