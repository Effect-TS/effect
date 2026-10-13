---
"@effect/opentelemetry": patch
---

Logs emitted inside a span now include that span's context on the OpenTelemetry log record, so backends can link the log to its trace.
