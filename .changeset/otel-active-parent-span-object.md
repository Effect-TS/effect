---
"@effect/opentelemetry": patch
---

Start Effect spans that inherit the active OpenTelemetry span with that span itself, rather than with a copy of its span context. SDKs that record children on the parent span object, such as Sentry, now keep these spans in the parent's trace instead of dropping them.
