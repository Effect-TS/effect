---
"@effect/opentelemetry": patch
---

Keep log record bodies typed as OpenTelemetry `AnyValue` when `@opentelemetry/api` 1.10 is installed, which widened `AttributeValue` to `unknown`.
