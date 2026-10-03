---
"effect": patch
---

Deprecate the span event emission API in line with OpenTelemetry.

`Tracer.Span#event` and `Logger.tracerLogger` are now marked `@deprecated`.
OpenTelemetry has deprecated the Span Event API in favour of emitting events
through the Logs API, correlated to their span by trace and span id. Reading
events back off a span, as an exporter does, is unaffected, and neither the
method nor the logger is removed.

`OtlpLogger` already stamps the trace and span id onto every log record, so a
log exporter provides the same correlation without span events. Installing one
alongside `tracerLogger` exports each log twice, once as a log record and once
as a span event.

See the [OpenTelemetry announcement](https://opentelemetry.io/blog/2026/deprecating-span-events/)
and [OTEP 4430](https://github.com/open-telemetry/opentelemetry-specification/blob/main/oteps/4430-span-event-api-deprecation-plan.md).
