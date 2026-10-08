---
"@effect/opentelemetry": patch
---

Preserve the active OpenTelemetry parent span object when starting Effect spans. This prevents SDKs such as Sentry from dropping child spans.
